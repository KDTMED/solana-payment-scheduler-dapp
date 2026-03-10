import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { CLUSTER, clusterLabel } from "../config";

const BADGE_COLORS: Record<string, string> = {
  "mainnet-beta":
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  devnet: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  localnet: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function Header() {
  const { connection } = useConnection();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    connection
      .getVersion()
      .then(() => {
        if (!cancelled) setConnected(true);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection]);

  const badgeColor =
    BADGE_COLORS[CLUSTER] ?? BADGE_COLORS.devnet;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            ST
          </div>
          <h1 className="text-lg font-semibold text-white">
            Scheduled Transfer
          </h1>
          <span
            className={`ml-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${badgeColor}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-current animate-pulse" : "bg-slate-600"
              }`}
            />
            {clusterLabel()}
            {!connected && (
              <span className="text-slate-500 ml-1">(connecting…)</span>
            )}
          </span>
        </div>
        <WalletMultiButton className="!bg-brand-600 hover:!bg-brand-700 !rounded-lg !text-sm !py-2 !px-4" />
      </div>
    </header>
  );
}
