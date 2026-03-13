import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, AccountInfo } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import IDL from "../scheduled_transfer.json";
import { PaymentSchedule, PaymentRecord } from "../types";
import { findScheduleCounterPda, findPaymentSchedulePda, findPaymentRecordPda } from "../utils/pda";

function decodeSchedule(
  pubkey: PublicKey,
  info: AccountInfo<Buffer>,
): PaymentSchedule | null {
  try {
    const coder = new BorshAccountsCoder(IDL as any);
    const data = coder.decode("paymentSchedule", info.data);
    return {
      publicKey: pubkey,
      authority: data.authority,
      scheduleId: BigInt(data.scheduleId.toString()),
      recipient: data.recipient,
      tokenType: data.tokenType?.usdc !== undefined ? "USDC" : "USDT",
      schedule: data.schedule.map((s: any) => ({
        timestamp: Number(s.timestamp),
        amount: BigInt(s.amount),
      })),
      executedCount: data.executedCount,
      bump: data.bump,
    };
  } catch (e) {
    console.error("Failed to decode PaymentSchedule:", e);
    return null;
  }
}

function decodeRecord(
  pubkey: PublicKey,
  info: AccountInfo<Buffer>,
): PaymentRecord | null {
  try {
    const coder = new BorshAccountsCoder(IDL as any);
    const data = coder.decode("paymentRecord", info.data);
    return {
      publicKey: pubkey,
      timestamp: Number(data.timestamp),
      amount: BigInt(data.amount),
      recipient: data.recipient,
      executedAt: Number(data.executedAt),
      paymentIndex: data.paymentIndex,
      bump: data.bump,
    };
  } catch (e) {
    console.error("Failed to decode PaymentRecord:", e);
    return null;
  }
}

export function useSchedule() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setSchedule(null);
      setRecords([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const coder = new BorshAccountsCoder(IDL as any);

      // Resolve the latest schedule ID via the ScheduleCounter PDA
      const [counterPda] = findScheduleCounterPda(publicKey);
      const counterInfo = await connection.getAccountInfo(counterPda);
      if (!counterInfo) {
        setSchedule(null);
        setRecords([]);
        return;
      }
      const counterData = coder.decode("scheduleCounter", counterInfo.data);
      const nextId = BigInt(counterData.nextId.toString());
      if (nextId === 0n) {
        setSchedule(null);
        setRecords([]);
        return;
      }
      const latestId = nextId - 1n;

      const [schedulePda] = findPaymentSchedulePda(publicKey, latestId);
      const scheduleInfo = await connection.getAccountInfo(schedulePda);

      if (!scheduleInfo) {
        setSchedule(null);
        setRecords([]);
        return;
      }

      const decoded = decodeSchedule(schedulePda, scheduleInfo);
      setSchedule(decoded);

      if (!decoded) {
        setRecords([]);
        return;
      }

      // Probe payment record PDAs for indices 0..99
      const recordKeys: PublicKey[] = Array.from({ length: 100 }, (_, i) => {
        const [pda] = findPaymentRecordPda(schedulePda, i);
        return pda;
      });

      const infos = await connection.getMultipleAccountsInfo(recordKeys);
      const allRecords: PaymentRecord[] = [];
      infos.forEach((info, idx) => {
        if (!info) return;
        const rec = decodeRecord(recordKeys[idx], info);
        if (rec) allRecords.push(rec);
      });

      allRecords.sort((a, b) => b.executedAt - a.executedAt);
      setRecords(allRecords);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { schedule, records, loading, error, refresh };
}
