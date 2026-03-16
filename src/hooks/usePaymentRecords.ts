import { useEffect, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import IDL from "../idl/scheduled_transfer.json";
import { PaymentRecord, PaymentSchedule } from "../types";

const coder = new BorshCoder(IDL as any);

export function usePaymentRecords(schedule: PaymentSchedule | null) {
  const { connection } = useConnection();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!schedule || schedule.executedCount === 0) {
      setRecords([]);
      return;
    }

    setLoading(true);
    try {
      const pda = schedule.publicKey;
      const signatures = await connection.getSignaturesForAddress(pda, {
        limit: 100,
      });

      const parsed: PaymentRecord[] = [];

      for (const sig of signatures) {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta?.logMessages) continue;

        for (const log of tx.meta.logMessages) {
          if (!log.startsWith("Program data: ")) continue;
          const data = Buffer.from(log.slice("Program data: ".length), "base64");
          try {
            const event = coder.events.decode(data.toString("base64"));
            if (!event || event.name !== "PaymentExecuted") continue;

            const d = event.data as any;
            parsed.push({
              publicKey: new PublicKey(d.schedule),
              timestamp: Number(d.scheduledTimestamp ?? d.scheduled_timestamp),
              amount: BigInt((d.amount).toString()),
              recipient: new PublicKey(d.recipient),
              executedAt: Number(d.executedAt ?? d.executed_at),
              paymentIndex: d.paymentIndex ?? d.payment_index,
              bump: 0,
            });
          } catch {
            // not a decodable event, skip
          }
        }
      }

      // Sort by payment index ascending
      parsed.sort((a, b) => a.paymentIndex - b.paymentIndex);
      setRecords(parsed);
    } catch (e) {
      console.error("Failed to fetch payment records:", e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [connection, schedule]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { records, loading, refresh };
}
