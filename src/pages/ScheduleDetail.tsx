import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AccountInfo } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import IDL from "../idl/scheduled_transfer.json";
import { PaymentSchedule } from "../types";
import { findPaymentSchedulePda } from "../utils/pda";
import { ScheduleCard } from "../components/ScheduleCard";
import { FundStatus } from "../components/FundStatus";
import { PaymentsTable } from "../components/PaymentsTable";
import { useFundStatus } from "../hooks/useFundStatus";

function decodeSchedule(
  pubkey: import("@solana/web3.js").PublicKey,
  info: AccountInfo<Buffer>,
): PaymentSchedule | null {
  try {
    const coder = new BorshAccountsCoder(IDL as any);
    const data = coder.decode("PaymentSchedule", info.data);
    return {
      publicKey: pubkey,
      authority: data.authority,
      scheduleId: BigInt(data.schedule_id.toString()),
      recipient: data.recipient,
      tokenType: data.token_type?.USDC !== undefined ? "USDC" : "USDT",
      schedule: data.schedule.map((s: any) => ({
        timestamp: Number(s.timestamp),
        amount: BigInt(s.amount),
      })),
      executedCount: data.executed_count,
      bump: data.bump,
    };
  } catch (e) {
    console.error("Failed to decode PaymentSchedule:", e);
    return null;
  }
}

export function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { status, refresh: refreshFunds } = useFundStatus(schedule);

  const refresh = useCallback(async () => {
    if (!publicKey || id === undefined) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduleId = BigInt(id);
      const [pda] = findPaymentSchedulePda(publicKey, scheduleId);
      const info = await connection.getAccountInfo(pda);
      if (!info) {
        setSchedule(null);
      } else {
        setSchedule(decodeSchedule(pda, info));
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleRefresh() {
    refresh();
    refreshFunds();
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-slate-500 text-sm">Connect your wallet to view this schedule.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-brand-500 rounded-full animate-spin" />
          Loading schedule…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm text-slate-500 hover:text-white transition-colors">
          &larr; Back to schedules
        </Link>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center">
          <p className="text-slate-500 text-sm">Schedule not found. It may have been closed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500 hover:text-white transition-colors">
          &larr; Back to schedules
        </Link>
        <button
          onClick={handleRefresh}
          className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>&orarr;</span> Refresh
        </button>
      </div>

      <ScheduleCard schedule={schedule} onClose={handleRefresh} />
      <FundStatus status={status} schedule={schedule} onRefresh={handleRefresh} />
      <PaymentsTable schedule={schedule} records={[]} tokenType={schedule.tokenType} />
    </div>
  );
}
