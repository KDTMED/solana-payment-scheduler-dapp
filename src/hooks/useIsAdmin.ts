import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import IDL from "../../idl/scheduled_transfer.json";
import type { ScheduledTransfer } from "../../idl/scheduled_transfer";
import { PROGRAM_ID } from "../constants";
import { findProgramConfigPda } from "../utils/pda";

/**
 * Returns true if the connected wallet is the program's upgrade authority
 * or is listed as an admin in the on-chain program config.
 */
export function useIsAdmin(): boolean | null {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) {
      setIsAdmin(null);
      return;
    }

    let cancelled = false;
    const walletKey = wallet.publicKey;

    (async () => {
      try {
        // Check if wallet is in the admin list
        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: "confirmed",
        });
        const program = new Program<ScheduledTransfer>(
          IDL as unknown as ScheduledTransfer,
          provider,
        );
        const [configPda] = findProgramConfigPda();
        const configInfo = await connection.getAccountInfo(configPda);

        if (configInfo && configInfo.data.length > 0) {
          const config = program.coder.accounts.decode("programConfig", configInfo.data);
          const admins: string[] = config.admins.map((a: PublicKey) => a.toBase58());
          if (admins.includes(walletKey.toBase58())) {
            if (!cancelled) setIsAdmin(true);
            return;
          }
        }

        // Check if wallet is the upgrade authority
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        if (programInfo && programInfo.data.length >= 36) {
          // BPF upgradeable program: first 4 bytes = account type, next 32 = programdata address
          const programDataAddress = new PublicKey(programInfo.data.slice(4, 36));
          const programDataInfo = await connection.getAccountInfo(programDataAddress);
          if (programDataInfo && programDataInfo.data.length >= 45) {
            // programdata: 4 bytes type + 8 bytes slot + 1 byte option + 32 bytes authority
            const hasAuthority = programDataInfo.data[12] === 1;
            if (hasAuthority) {
              const authority = new PublicKey(programDataInfo.data.slice(13, 45));
              if (authority.equals(walletKey)) {
                if (!cancelled) setIsAdmin(true);
                return;
              }
            }
          }
        }

        if (!cancelled) setIsAdmin(false);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();

    return () => { cancelled = true; };
  }, [wallet.publicKey, connection]);

  return isAdmin;
}
