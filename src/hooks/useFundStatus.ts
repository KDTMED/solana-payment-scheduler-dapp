import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { PaymentSchedule, FundStatus } from "../types";
import { MIN_GAS_LAMPORTS, USDC_MINT, USDT_MINT } from "../constants";

export function useFundStatus(schedule: PaymentSchedule | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [status, setStatus] = useState<FundStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setStatus(null);
      return;
    }

    try {
      if (!schedule) {
        setStatus(null);
        return;
      }
      const schedulePda = schedule.publicKey;

      const solBalance = await connection.getBalance(schedulePda);

      // Derive and query USDC ATA of the schedule PDA
      let usdcBalance = 0n;
      let usdcTokenAccount = null;
      try {
        const usdcAta = await getAssociatedTokenAddress(
          USDC_MINT,
          schedulePda,
          true, // allowOwnerOffCurve — PDA is off-curve
        );
        const acct = await getAccount(connection, usdcAta);
        usdcBalance = acct.amount;
        usdcTokenAccount = usdcAta;
      } catch {
        // Account doesn't exist yet
      }

      // Derive and query USDT ATA of the schedule PDA
      let usdtBalance = 0n;
      let usdtTokenAccount = null;
      try {
        const usdtAta = await getAssociatedTokenAddress(
          USDT_MINT,
          schedulePda,
          true,
        );
        const acct = await getAccount(connection, usdtAta);
        usdtBalance = acct.amount;
        usdtTokenAccount = usdtAta;
      } catch {
        // Account doesn't exist yet
      }

      const nextPayment = schedule?.schedule[0] ?? null;
      const requiredForNext = nextPayment ? nextPayment.amount : null;
      const scheduleBalance =
        schedule?.tokenType === "USDC" ? usdcBalance : usdtBalance;

      setStatus({
        solBalance,
        isGasSufficient: BigInt(solBalance) >= MIN_GAS_LAMPORTS,
        usdcBalance,
        usdtBalance,
        usdcTokenAccount,
        usdtTokenAccount,
        requiredForNext,
        isSufficient:
          requiredForNext !== null
            ? scheduleBalance >= requiredForNext
            : true,
      });
    } catch {
      setStatus(null);
    }
  }, [connection, publicKey, schedule]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { status, refresh };
}
