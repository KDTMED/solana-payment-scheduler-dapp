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
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatTokenAmount, formatSol } from "../utils/format";
import {
  TOKEN_DECIMALS,
  USDC_MINT_DEVNET,
  USDT_MINT_DEVNET,
} from "../constants";
import { findPaymentSchedulePda } from "../utils/pda";
import IDL from "../scheduled_transfer.json";
import type { ScheduledTransfer } from "../scheduled_transfer";

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
function parseTokenAmount(input: string, decimals: number): bigint | null {
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

  const [topupUsdc, setTopupUsdc] = useState("");
  const [topupUsdt, setTopupUsdt] = useState("");
  const [topupSol, setTopupSol] = useState("");
  const [withdrawUsdc, setWithdrawUsdc] = useState("");
  const [withdrawUsdt, setWithdrawUsdt] = useState("");
  const [withdrawSol, setWithdrawSol] = useState("");
  const [busy, setBusy] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  function togglePanel(key: PanelKey) {
    setActivePanel((prev) => (prev === key ? null : key));
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
      const wallet = { publicKey, sendTransaction } as any;
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(IDL as unknown as ScheduledTransfer, provider);
      const userAta = await getAssociatedTokenAddress(mint, publicKey);

      const sig = await program.methods
        .withdrawTokens(new BN(amount.toString()))
        .accounts({
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
    if (!publicKey) return;
    const raw = parseFloat(topupSol);
    if (isNaN(raw) || raw <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      const [schedulePda] = findPaymentSchedulePda(publicKey);
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
    if (!publicKey) return;
    const raw = parseFloat(withdrawSol);
    if (isNaN(raw) || raw <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      const wallet = { publicKey, sendTransaction } as any;
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(IDL as unknown as ScheduledTransfer, provider);
      const lamports = Math.round(raw * LAMPORTS_PER_SOL);

      const sig = await program.methods
        .withdrawSol(new BN(lamports))
        .accounts({})
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

  // Determine if USDC or USDT is the "schedule token" for the required badge
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
                No {label} token account found for this schedule PDA.
              </p>
            )}
          </div>
        )}

        {activePanel === withdrawKey && (
          <div className="mt-3 space-y-2">
            <input
              type="number"
              min="0"
              step="any"
              value={withdrawValue}
              onChange={(e) => setWithdrawValue(e.target.value)}
              placeholder={`Amount (${label})`}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() =>
                handleWithdrawToken(mint, tokenAccount, withdrawValue, () =>
                  setWithdrawValue(""),
                )
              }
              disabled={busy || !tokenAccount}
              className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Withdrawing…" : "Withdraw"}
            </button>
            {!tokenAccount && (
              <p className="text-xs text-amber-400">
                No {label} token account found for this schedule PDA.
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tokenPanel(
          "USDC",
          status?.usdcBalance ?? 0n,
          status?.usdcTokenAccount ?? null,
          "topup-usdc",
          "withdraw-usdc",
          topupUsdc,
          setTopupUsdc,
          withdrawUsdc,
          setWithdrawUsdc,
          USDC_MINT_DEVNET,
        )}

        {tokenPanel(
          "USDT",
          status?.usdtBalance ?? 0n,
          status?.usdtTokenAccount ?? null,
          "topup-usdt",
          "withdraw-usdt",
          topupUsdt,
          setTopupUsdt,
          withdrawUsdt,
          setWithdrawUsdt,
          USDT_MINT_DEVNET,
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
              <input
                type="number"
                min="0"
                step="any"
                value={withdrawSol}
                onChange={(e) => setWithdrawSol(e.target.value)}
                placeholder="Amount (SOL)"
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
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
