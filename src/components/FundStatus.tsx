import { explorerClusterParam } from "../config";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatTokenAmount, formatSol } from "../utils/format";
import {
  TOKEN_DECIMALS,
  USDC_MINT,
  USDT_MINT,
  MIN_GAS_LAMPORTS,
} from "../constants";
import IDL from "../idl/scheduled_transfer.json";
import type { ScheduledTransfer } from "../idl/scheduled_transfer";

interface Props {
  status: FundStatusType | null;
  schedule: PaymentSchedule | null;
  onRefresh: () => void;
}

type PanelKey =
  | "topup-usdc"
  | "topup-usdt"
  | "topup-sol"
  | "withdraw-usdc"
  | "withdraw-usdt"
  | "withdraw-sol";

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
  const {
    publicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = useWallet();

  const [topupUsdc, setTopupUsdc] = useState("");
  const [topupUsdt, setTopupUsdt] = useState("");
  const [topupSol, setTopupSol] = useState("");
  const [withdrawUsdc, setWithdrawUsdc] = useState("");
  const [withdrawUsdt, setWithdrawUsdt] = useState("");
  const [withdrawSol, setWithdrawSol] = useState("");
  const [busy, setBusy] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  // Per-panel inline validation errors
  const [withdrawUsdcError, setWithdrawUsdcError] = useState<string | null>(
    null,
  );
  const [withdrawUsdtError, setWithdrawUsdtError] = useState<string | null>(
    null,
  );
  const [withdrawSolError, setWithdrawSolError] = useState<string | null>(
    null,
  );

  function togglePanel(key: PanelKey) {
    setActivePanel((prev) => (prev === key ? null : key));
    // Clear errors when toggling panels
    setWithdrawUsdcError(null);
    setWithdrawUsdtError(null);
    setWithdrawSolError(null);
  }

  function makeAnchorWallet() {
    return {
      publicKey,
      sendTransaction,
      signTransaction,
      signAllTransactions,
    } as any;
  }

  async function handleCreateAta(mint: PublicKey) {
    if (!publicKey || !schedule) return;

    setBusy(true);
    setTxSig(null);
    try {
      const schedulePda = schedule.publicKey;
      const ata = await getAssociatedTokenAddress(
        mint,
        schedulePda,
        true,
      );

      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          ata,
          schedulePda,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed to create token account");
    } finally {
      setBusy(false);
    }
  }

  async function handleTopupToken(
    mint: PublicKey,
    sourceTokenAccount: PublicKey | null,
    rawInput: string,
    clearInput: () => void,
  ) {
    if (!publicKey || !sourceTokenAccount) return;
    const amount = parseTokenAmount(rawInput, TOKEN_DECIMALS);
    if (amount === null || amount <= 0n) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      const userAta = await getAssociatedTokenAddress(mint, publicKey);
      const tx = new Transaction().add(
        createTransferInstruction(
          userAta,
          sourceTokenAccount,
          publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      clearInput();
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdrawToken(
    mint: PublicKey,
    sourceTokenAccount: PublicKey | null,
    balance: bigint,
    rawInput: string,
    clearInput: () => void,
    setError: (msg: string | null) => void,
  ) {
    if (!publicKey || !sourceTokenAccount || !schedule) return;

    const amount = parseTokenAmount(rawInput, TOKEN_DECIMALS);
    if (amount === null || amount <= 0n) {
      setError("Enter a valid positive amount.");
      return;
    }
    // ── Balance guard ──────────────────────────────────────────────
    if (amount > balance) {
      setError(
        `Insufficient balance. Available: ${formatTokenAmount(balance)}.`,
      );
      return;
    }
    setError(null);

    setBusy(true);
    setTxSig(null);
    try {
      const provider = new AnchorProvider(connection, makeAnchorWallet(), {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(
        IDL as unknown as ScheduledTransfer,
        provider,
      );
      const userAta = await getAssociatedTokenAddress(mint, publicKey);

      const sig = await program.methods
        .withdrawTokens(new BN(amount.toString()))
        .accountsPartial({
          paymentSchedule: schedule.publicKey,
          sourceTokenAccount,
          destinationTokenAccount: userAta,
        })
        .rpc();

      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      clearInput();
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTopupSol() {
    if (!publicKey || !schedule) return;
    const raw = parseFloat(topupSol);
    if (isNaN(raw) || raw <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      const schedulePda = schedule.publicKey;
      const lamports = Math.round(raw * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: schedulePda,
          lamports,
        }),
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setTopupSol("");
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdrawSol() {
    if (!publicKey || !schedule) return;
    const raw = parseFloat(withdrawSol);
    if (isNaN(raw) || raw <= 0) {
      setWithdrawSolError("Enter a valid positive amount.");
      return;
    }

    const lamports = Math.round(raw * LAMPORTS_PER_SOL);
    const solBalance = status?.solBalance ?? 0;

    // ── Balance guard ──────────────────────────────────────────────
    // The on-chain program always preserves the rent-exempt minimum, so
    // the most the user can withdraw is (balance − MIN_GAS_LAMPORTS).
    // We use MIN_GAS_LAMPORTS as a safe proxy for the rent-exempt reserve.
    const withdrawable = Math.max(
      0,
      solBalance - Number(MIN_GAS_LAMPORTS),
    );
    if (lamports > withdrawable) {
      setWithdrawSolError(
        `Amount exceeds withdrawable balance. Max: ${formatSol(withdrawable)} SOL (rent-exempt minimum is always reserved).`,
      );
      return;
    }
    setWithdrawSolError(null);

    setBusy(true);
    setTxSig(null);
    try {
      const provider = new AnchorProvider(connection, makeAnchorWallet(), {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(
        IDL as unknown as ScheduledTransfer,
        provider,
      );

      const sig = await program.methods
        .withdrawSol(new BN(lamports))
        .accountsPartial({
          paymentSchedule: schedule.publicKey,
        })
        .rpc();

      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setWithdrawSol("");
      onRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  const scheduleTokenType = schedule?.tokenType ?? null;

  function tokenPanel(
    label: "USDC" | "USDT",
    balance: bigint,
    tokenAccount: PublicKey | null,
    topupKey: PanelKey,
    withdrawKey: PanelKey,
    topupValue: string,
    setTopupValue: (v: string) => void,
    withdrawValue: string,
    setWithdrawValue: (v: string) => void,
    mint: PublicKey,
    withdrawError: string | null,
    setWithdrawError: (msg: string | null) => void,
  ) {
    const isScheduleToken = scheduleTokenType === label;
    return (
      <div className="rounded-lg bg-slate-800 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">{label} Balance</span>
          {isScheduleToken && (
            <StatusBadge ok={status?.isSufficient ?? true} />
          )}
        </div>
        <p className="text-2xl font-bold text-white">
          {status ? formatTokenAmount(balance) : "—"}
        </p>
        {isScheduleToken && status?.requiredForNext != null && (
          <p className="text-xs text-slate-500">
            Next payment requires{" "}
            <span className="text-slate-300">
              {formatTokenAmount(status.requiredForNext)}
            </span>
          </p>
        )}

        {status && !tokenAccount && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
            <p className="text-xs text-amber-400">
              No {label} token account exists for this schedule PDA yet.
              Create one before you can top up or withdraw.
            </p>
            <button
              onClick={() => handleCreateAta(mint)}
              disabled={busy}
              className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Creating…" : `Create ${label} Account`}
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => togglePanel(topupKey)}
            className="flex-1 text-xs py-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            Top Up
          </button>
          <button
            onClick={() => togglePanel(withdrawKey)}
            className="flex-1 text-xs py-1.5 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Withdraw
          </button>
        </div>

        {activePanel === topupKey && (
          <div className="mt-3 space-y-2">
            <input
              type="number"
              min="0"
              step="any"
              value={topupValue}
              onChange={(e) => setTopupValue(e.target.value)}
              placeholder={`Amount (${label})`}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() =>
                handleTopupToken(mint, tokenAccount, topupValue, () =>
                  setTopupValue(""),
                )
              }
              disabled={busy || !tokenAccount}
              className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            {!tokenAccount && (
              <p className="text-xs text-amber-400">
                No {label} token account found. Create one above first.
              </p>
            )}
          </div>
        )}

        {activePanel === withdrawKey && (
          <div className="mt-3 space-y-2">
            {/* Available balance hint */}
            {status && (
              <p className="text-xs text-slate-500">
                Available:{" "}
                <span className="text-slate-300">
                  {formatTokenAmount(balance)} {label}
                </span>
              </p>
            )}
            <input
              type="number"
              min="0"
              step="any"
              value={withdrawValue}
              onChange={(e) => {
                setWithdrawValue(e.target.value);
                setWithdrawError(null);
              }}
              placeholder={`Amount (${label})`}
              className={`w-full bg-slate-700 border rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 ${
                withdrawError
                  ? "border-red-500"
                  : "border-slate-600"
              }`}
            />
            {withdrawError && (
              <p className="text-xs text-red-400">{withdrawError}</p>
            )}
            <button
              onClick={() =>
                handleWithdrawToken(
                  mint,
                  tokenAccount,
                  balance,
                  withdrawValue,
                  () => setWithdrawValue(""),
                  setWithdrawError,
                )
              }
              disabled={busy || !tokenAccount}
              className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Withdrawing…" : "Withdraw"}
            </button>
            {!tokenAccount && (
              <p className="text-xs text-amber-400">
                No {label} token account found. Create one above first.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Fund Status
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {scheduleTokenType === "USDC"
          ? tokenPanel(
              "USDC",
              status?.usdcBalance ?? 0n,
              status?.usdcTokenAccount ?? null,
              "topup-usdc",
              "withdraw-usdc",
              topupUsdc,
              setTopupUsdc,
              withdrawUsdc,
              setWithdrawUsdc,
              USDC_MINT,
              withdrawUsdcError,
              setWithdrawUsdcError,
            )
          : tokenPanel(
              "USDT",
              status?.usdtBalance ?? 0n,
              status?.usdtTokenAccount ?? null,
              "topup-usdt",
              "withdraw-usdt",
              topupUsdt,
              setTopupUsdt,
              withdrawUsdt,
              setWithdrawUsdt,
              USDT_MINT,
              withdrawUsdtError,
              setWithdrawUsdtError,
            )}

        {/* SOL panel */}
        <div className="rounded-lg bg-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">SOL Balance</span>
            {status && (
              <StatusBadge
                ok={status.isGasSufficient}
                label={status.isGasSufficient ? "OK" : "Low"}
              />
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            {status ? `${formatSol(status.solBalance)} SOL` : "—"}
          </p>
          <p className="text-xs text-slate-500">
            Needed to cover transaction fees
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => togglePanel("topup-sol")}
              className="flex-1 text-xs py-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              Top Up
            </button>
            <button
              onClick={() => togglePanel("withdraw-sol")}
              className="flex-1 text-xs py-1.5 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Withdraw
            </button>
          </div>

          {activePanel === "topup-sol" && (
            <div className="mt-3 space-y-2">
              <input
                type="number"
                min="0"
                step="any"
                value={topupSol}
                onChange={(e) => setTopupSol(e.target.value)}
                placeholder="Amount (SOL)"
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleTopupSol}
                disabled={busy}
                className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white transition-colors"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          )}

          {activePanel === "withdraw-sol" && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">
                Rent-exempt minimum is always preserved.
              </p>
              {/* Withdrawable balance hint */}
              {status && (
                <p className="text-xs text-slate-500">
                  Available:{" "}
                  <span className="text-slate-300">
                    {formatSol(
                      Math.max(
                        0,
                        status.solBalance - Number(MIN_GAS_LAMPORTS),
                      ),
                    )}{" "}
                    SOL
                  </span>
                </p>
              )}
              <input
                type="number"
                min="0"
                step="any"
                value={withdrawSol}
                onChange={(e) => {
                  setWithdrawSol(e.target.value);
                  setWithdrawSolError(null);
                }}
                placeholder="Amount (SOL)"
                className={`w-full bg-slate-700 border rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 ${
                  withdrawSolError ? "border-red-500" : "border-slate-600"
                }`}
              />
              {withdrawSolError && (
                <p className="text-xs text-red-400">{withdrawSolError}</p>
              )}
              <button
                onClick={handleWithdrawSol}
                disabled={busy}
                className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm text-white transition-colors"
              >
                {busy ? "Withdrawing…" : "Withdraw"}
              </button>
            </div>
          )}
        </div>
      </div>

      {txSig && (
        <div className="text-xs text-emerald-400 break-all">
          ✓ Tx confirmed:{" "}
          <a
            href={`https://explorer.solana.com/tx/${encodeURIComponent(txSig)}${explorerClusterParam()}`}
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
