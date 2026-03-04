import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatTokenAmount, formatSol } from "../utils/format";
import {
  TOKEN_DECIMALS,
  USDC_MINT_DEVNET,
  USDT_MINT_DEVNET,
} from "../constants";

interface Props {
  status: FundStatusType | null;
  schedule: PaymentSchedule | null;
  onRefresh: () => void;
}

/**
 * Convert a decimal string to raw token units without floating-point
 * precision loss.
 */
function parseTokenAmount(
  input: string,
  decimals: number,
): bigint | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === ".") return null;

  const parts = trimmed.split(".");
  if (parts.length > 2) return null;

  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);

  try {
    return BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac);
  } catch {
    return null;
  }
}

export function FundStatus({ status, schedule, onRefresh }: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [topupAmount, setTopupAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"token" | "sol" | null>(
    null,
  );

  async function handleTokenTopup() {
    if (!publicKey || !schedule || !status?.sourceTokenAccount) return;

    // FIX 1: Use integer-safe parsing instead of floating-point arithmetic
    const amount = parseTokenAmount(topupAmount, TOKEN_DECIMALS);
    if (amount === null || amount <= 0n) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      // FIX 2: Derive the expected mint from the schedule's tokenType
      // instead of trusting on-chain account data that could be spoofed
      // or stale.
      const expectedMint =
        schedule.tokenType === "USDC"
          ? USDC_MINT_DEVNET
          : USDT_MINT_DEVNET;

      // FIX 3: Validate that the source token account actually holds
      // the expected mint before transferring.
      const srcAcctInfo = await connection.getParsedAccountInfo(
        status.sourceTokenAccount,
      );
      const parsedData = srcAcctInfo.value?.data;
      if (
        !parsedData ||
        typeof parsedData === "string" ||
        !("parsed" in parsedData)
      ) {
        throw new Error("Could not parse source token account data.");
      }
      const onChainMint = parsedData.parsed?.info?.mint;
      if (!onChainMint) {
        throw new Error("Source token account has no mint.");
      }
      if (onChainMint !== expectedMint.toBase58()) {
        throw new Error(
          `Mint mismatch: expected ${expectedMint.toBase58()} but source account holds ${onChainMint}.`,
        );
      }

      // FIX 4: Use getAssociatedTokenAddress (pure derivation) instead of
      // getOrCreateAssociatedTokenAccount which required a real Signer the
      // old code could not provide.
      const userAta = await getAssociatedTokenAddress(
        expectedMint,
        publicKey,
      );

      const tx = new Transaction().add(
        createTransferInstruction(
          userAta,
          status.sourceTokenAccount,
          publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setTopupAmount("");
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSolTopup() {
    if (!publicKey || !schedule) return;
    const raw = parseFloat(solAmount);
    if (isNaN(raw) || raw <= 0) return;

    setBusy(true);
    setTxSig(null);
    try {
      const lamports = Math.round(raw * LAMPORTS_PER_SOL);

      // FIX 5: Send SOL to the schedule PDA, not schedule.authority
      // (which is the user's own wallet). The program needs SOL on the
      // PDA to cover rent / CPI fees for trigger_payment.
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: schedule.publicKey,
          lamports,
        }),
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setSolAmount("");
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Fund Status
        </h2>
        <p className="text-slate-500 text-sm">No schedule found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Fund Status
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Token funds */}
        <div className="rounded-lg bg-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              {schedule?.tokenType ?? "Token"} Balance
            </span>
            <StatusBadge ok={status.isSufficient} />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatTokenAmount(status.tokenBalance)}
          </p>
          {status.requiredForNext != null && (
            <p className="text-xs text-slate-500">
              Next payment requires{" "}
              <span className="text-slate-300">
                {formatTokenAmount(status.requiredForNext)}
              </span>
            </p>
          )}
          <button
            onClick={() =>
              setActivePanel(activePanel === "token" ? null : "token")
            }
            className="mt-2 w-full text-xs py-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            Top Up Tokens
          </button>

          {activePanel === "token" && (
            <div className="mt-3 space-y-2">
              <input
                type="number"
                min="0"
                step="any"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder={`Amount (${schedule?.tokenType})`}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleTokenTopup}
                disabled={busy || !status.sourceTokenAccount}
                className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white transition-colors"
              >
                {busy ? "Sending…" : "Send"}
              </button>
              {!status.sourceTokenAccount && (
                <p className="text-xs text-amber-400">
                  No source token account found for this schedule PDA.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Gas funds */}
        <div className="rounded-lg bg-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">SOL Balance</span>
            <StatusBadge
              ok={status.isGasSufficient}
              label={status.isGasSufficient ? "OK" : "Low"}
            />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatSol(status.solBalance)} SOL
          </p>
          <p className="text-xs text-slate-500">
            Needed to cover transaction fees
          </p>
          <button
            onClick={() =>
              setActivePanel(activePanel === "sol" ? null : "sol")
            }
            className="mt-2 w-full text-xs py-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            Top Up SOL
          </button>

          {activePanel === "sol" && (
            <div className="mt-3 space-y-2">
              <input
                type="number"
                min="0"
                step="any"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                placeholder="Amount (SOL)"
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleSolTopup}
                disabled={busy}
                className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white transition-colors"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          )}
        </div>
      </div>

      {txSig && (
        <div className="text-xs text-emerald-400 break-all">
          ✓ Tx confirmed:{" "}
          <a
            href={`https://explorer.solana.com/tx/${encodeURIComponent(txSig)}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {txSig.slice(0, 24)}…
          </a>
        </div>
      )}
    </div>
  );
}
