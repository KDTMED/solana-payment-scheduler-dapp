import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PaymentSchedule } from "../types";
import { formatTokenAmount } from "../utils/format";
import IDL from "../idl/scheduled_transfer.json";
import type { ScheduledTransfer } from "../idl/scheduled_transfer";

interface Props {
  schedule: PaymentSchedule | null;
  onClose: () => void;
}

export function ScheduleCard({ schedule, onClose }: Props) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!schedule) return null;

  const totalRemaining = schedule.schedule.reduce(
    (acc, p) => acc + p.amount,
    0n,
  );

  async function handleClose() {
    if (!wallet.publicKey || !wallet.signTransaction || !schedule) return;

    setBusy(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(IDL as unknown as ScheduledTransfer, provider);

      await program.methods
        .close()
        .accountsPartial({
          paymentSchedule: schedule.publicKey,
          authority: wallet.publicKey,
        })
        .rpc();

      setConfirming(false);
      onClose();
    } catch (err: any) {
      alert(err?.message ?? "Failed to close schedule");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            Payment Schedule
          </p>
          <p className="text-xs text-slate-500 font-mono break-all">
            {schedule.publicKey.toBase58()}
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {schedule.schedule.length}
            </p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <p className="text-2xl font-bold text-white">
              {formatTokenAmount(totalRemaining)}
            </p>
            <p className="text-xs text-slate-500">
              Total {schedule.tokenType} remaining
            </p>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <p className="text-2xl font-bold text-white">
              {schedule.tokenType}
            </p>
            <p className="text-xs text-slate-500">Token type</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <span className="text-slate-600">Recipient: </span>
          <span className="font-mono text-slate-400">
            {schedule.recipient?.toBase58().slice(0, 20) ?? "—"}…
          </span>
        </div>
        <div>
          <span className="text-slate-600">Schedule ID: </span>
          <span className="font-mono text-slate-400">
            {schedule.scheduleId.toString()}
          </span>
        </div>
      </div>

      {/* Close schedule */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        {confirming ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-amber-400">
              Close this schedule and reclaim rent? This cannot be undone.
            </p>
            <button
              onClick={handleClose}
              disabled={busy}
              className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm text-white transition-colors"
            >
              {busy ? "Closing…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="px-4 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Close Schedule
          </button>
        )}
      </div>
    </div>
  );
}
