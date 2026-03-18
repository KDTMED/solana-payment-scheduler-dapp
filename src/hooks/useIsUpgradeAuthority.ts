import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../constants";

/**
 * Returns true if the connected wallet is the program's upgrade authority.
 */
export function useIsUpgradeAuthority(): boolean | null {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isUpgradeAuth, setIsUpgradeAuth] = useState<boolean | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) {
      setIsUpgradeAuth(null);
      return;
    }

    let cancelled = false;
    const walletKey = wallet.publicKey;

    (async () => {
      try {
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        if (programInfo && programInfo.data.length >= 36) {
          const programDataAddress = new PublicKey(programInfo.data.slice(4, 36));
          const programDataInfo = await connection.getAccountInfo(programDataAddress);
          if (programDataInfo && programDataInfo.data.length >= 45) {
            const hasAuthority = programDataInfo.data[12] === 1;
            if (hasAuthority) {
              const authority = new PublicKey(programDataInfo.data.slice(13, 45));
              if (authority.equals(walletKey)) {
                if (!cancelled) setIsUpgradeAuth(true);
                return;
              }
            }
          }
        }
        if (!cancelled) setIsUpgradeAuth(false);
      } catch {
        if (!cancelled) setIsUpgradeAuth(false);
      }
    })();

    return () => { cancelled = true; };
  }, [wallet.publicKey, connection]);

  return isUpgradeAuth;
}
