import { explorerClusterParam } from "../config";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatTokenAmount } from "../utils/format";
import {
  TOKEN_DECIMALS,
  USDC_MINT,
  USDT_MINT,
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
  | "withdraw-usdc"
  | "withdraw-usdt";

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
  const [withdrawUsdc, setWithdrawUsdc] = useState("");
  const [withdrawUsdt, setWithdrawUsdt] = useState("");
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
  function togglePanel(key: PanelKey) {
    setActivePanel((prev) => (prev === key ? null : key));
    // Clear errors when toggling panels
    setWithdrawUsdcError(null);
    setWithdrawUsdtError(null);
  }

  function makeAnchorWallet() {
    return {
      publicKey,
      sendTransaction,
      signTransaction,
      signAllTransactions,
    } as any;
  }

  async function handleTopupToken(
    mint: PublicKey,
    rawInput: string,
    clearInput: () => void,
  ) {
    if (!publicKey || !schedule) return;
    const amount = parseTokenAmount(rawInput, TOKEN_DECIMALS);
    if (amount === null || amount <= 0n) {
      alert("Enter a valid positive amount.");
      return;
    }

    setBusy(true);
    setTxSig(null);
    try {
      const userAta = await getAssociatedTokenAddress(mint, publicKey);
      const sourceTokenAccount = await getAssociatedTokenAddress(mint, schedule.publicKey, true);
      const tx = new Transaction();
      // Create the schedule's ATA if it doesn't exist yet
      const ataInfo = await connection.getAccountInfo(sourceTokenAccount);
      if (!ataInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            sourceTokenAccount,
            schedule.publicKey,
            mint,
          ),
        );
      }
      tx.add(
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
      console.error("Transfer failed:", e);
      alert("Transfer failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdrawToken(
    mint: PublicKey,
    balance: bigint,
    rawInput: string,
    clearInput: () => void,
    setError: (msg: string | null) => void,
  ) {
    if (!publicKey || !schedule) return;

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
      const sourceTokenAccount = await getAssociatedTokenAddress(mint, schedule.publicKey, true);

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
      console.error("Withdraw failed:", e);
      alert("Withdraw failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const scheduleTokenType = schedule?.tokenType ?? null;

  function tokenPanel(
    label: "USDC" | "USDT",
    balance: bigint,
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
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left column: Balance */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
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
          </div>

          {/* Right column: Action buttons */}
          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={() => togglePanel(topupKey)}
              className="w-full text-xs py-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              Top Up
            </button>
            <button
              onClick={() => togglePanel(withdrawKey)}
              className="w-full text-xs py-1.5 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Withdraw
            </button>
          </div>
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
                handleTopupToken(mint, topupValue, () =>
                  setTopupValue(""),
                )
              }
              disabled={busy}
              className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Sending…" : "Send"}
            </button>
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
                  balance,
                  withdrawValue,
                  () => setWithdrawValue(""),
                  setWithdrawError,
                )
              }
              disabled={busy}
              className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Withdrawing…" : "Withdraw"}
            </button>
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

      <div className="space-y-4">
        {scheduleTokenType === "USDC"
          ? tokenPanel(
              "USDC",
              status?.usdcBalance ?? 0n,
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
