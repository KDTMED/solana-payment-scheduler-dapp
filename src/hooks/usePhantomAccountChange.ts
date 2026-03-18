import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

/**
 * Polls Phantom to detect account changes on localhost where
 * Phantom doesn't emit wallet standard `change` events.
 *
 * When a change is detected, emits a `connect` event on the adapter
 * with the new public key, which React's WalletProviderBase listens for.
 */
export function usePhantomAccountChange(intervalMs = 1000) {
  const { publicKey, wallet } = useWallet();
  const lastKey = useRef<string | null>(null);
  const adapterRef = useRef(wallet?.adapter ?? null);
  adapterRef.current = wallet?.adapter ?? null;

  useEffect(() => {
    if (publicKey) {
      lastKey.current = publicKey.toBase58();
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;

    const phantom = (window as any).phantom?.solana;
    if (!phantom) return;

    const id = setInterval(async () => {
      try {
        const resp = await phantom.connect({ onlyIfTrusted: true });
        const newKey = new PublicKey(resp.publicKey.toBytes());
        const newKeyStr = newKey.toBase58();
        if (lastKey.current && newKeyStr !== lastKey.current) {
          lastKey.current = newKeyStr;
          // Emit 'connect' on the adapter with the new key.
          // WalletProviderBase listens for this and calls setPublicKey().
          adapterRef.current?.emit("connect", newKey);
        }
      } catch {
        // Wallet not trusted or unavailable — ignore
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [publicKey, wallet, intervalMs]);
}
