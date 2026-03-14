import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, AccountInfo } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import IDL from "../idl/scheduled_transfer.json";
import { PaymentSchedule } from "../types";
import { findScheduleCounterPda, findPaymentSchedulePda } from "../utils/pda";

function decodeSchedule(
  pubkey: PublicKey,
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

export function useSchedules() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const coder = new BorshAccountsCoder(IDL as any);

      const [counterPda] = findScheduleCounterPda(publicKey);
      const counterInfo = await connection.getAccountInfo(counterPda);
      if (!counterInfo) {
        setSchedules([]);
        return;
      }
      const counterData = coder.decode("ScheduleCounter", counterInfo.data);
      const nextId = BigInt((counterData.next_id ?? counterData.nextId).toString());
      if (nextId === 0n) {
        setSchedules([]);
        return;
      }

      // Fetch all schedule PDAs in parallel
      const pdas: [PublicKey, bigint][] = [];
      for (let i = 0n; i < nextId; i++) {
        const [pda] = findPaymentSchedulePda(publicKey, i);
        pdas.push([pda, i]);
      }

      const accountInfos = await connection.getMultipleAccountsInfo(
        pdas.map(([pda]) => pda),
      );

      const decoded: PaymentSchedule[] = [];
      for (let i = 0; i < accountInfos.length; i++) {
        const info = accountInfos[i];
        if (!info) continue; // closed schedule
        const schedule = decodeSchedule(pdas[i][0], info);
        if (schedule) decoded.push(schedule);
      }

      setSchedules(decoded);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { schedules, loading, error, refresh };
}
