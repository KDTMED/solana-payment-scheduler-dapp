import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { PaymentSchedule, FundStatus } from "../types";
import { MIN_GAS_LAMPORTS } from "../constants";

export function useFundStatus(schedule: PaymentSchedule | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [status, setStatus] = useState<FundStatus | null>(null);
  const [sourceTokenAccount, setSourceTokenAccount] =
    useState<PublicKey | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !schedule) {
      setStatus(null);
      return;
    }

    try {
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        schedule.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      let tokenBalance = 0n;
      let srcPubkey: PublicKey | null = null;

      if (tokenAccounts.value.length > 0) {
        srcPubkey = tokenAccounts.value[0].pubkey;
        const acct = await getAccount(connection, srcPubkey);
        tokenBalance = acct.amount;
        setSourceTokenAccount(srcPubkey);
      } else {
        setSourceTokenAccount(null);
      }

      const solBalance = await connection.getBalance(publicKey);
      const nextPayment = schedule.schedule[0] ?? null;
      const requiredForNext = nextPayment ? nextPayment.amount : null;

      setStatus({
        tokenBalance,
        solBalance,
        requiredForNext,
        isSufficient:
          requiredForNext !== null ? tokenBalance >= requiredForNext : true,
        isGasSufficient: BigInt(solBalance) >= MIN_GAS_LAMPORTS,
        sourceTokenAccount: srcPubkey,
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

  return { status, sourceTokenAccount, refresh };
}
