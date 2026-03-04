import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";

import { Header } from "./components/Header";
import { ScheduleCard } from "./components/ScheduleCard";
import { FundStatus } from "./components/FundStatus";
import { PaymentsTable } from "./components/PaymentsTable";
import { InitializeForm } from "./components/InitializeForm";
import { useSchedule } from "./hooks/useSchedule";
import { useFundStatus } from "./hooks/useFundStatus";

function Dashboard() {
  const { publicKey } = useWallet();
  const { schedule, records, loading, error, refresh } = useSchedule();
  const { status, refresh: refreshFunds } = useFundStatus(schedule);

  function handleRefresh() {
    refresh();
    refreshFunds();
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
          🔐
        </div>
        <h2 className="text-xl font-semibold text-white">
          Connect your wallet
        </h2>
        <p className="text-slate-500 text-sm">
          Connect to view and manage your payment schedule.
        </p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {schedule ? "Your Schedule" : "No Schedule Found"}
        </h2>
        <button
          onClick={handleRefresh}
          className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>⟳</span> Refresh
        </button>
      </div>

      {schedule ? (
        <>
          <ScheduleCard schedule={schedule} />
          <FundStatus
            status={status}
            schedule={schedule}
            onRefresh={handleRefresh}
          />
          <PaymentsTable
            schedule={schedule}
            records={records}
            tokenType={schedule.tokenType}
          />
        </>
      ) : (
        <InitializeForm onSuccess={handleRefresh} />
      )}
    </div>
  );
}

export default function App() {
  const endpoint = useMemo(() => "http://localhost:8899", []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "confirmed" }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen bg-slate-950">
            <Header />
            <main className="max-w-5xl mx-auto px-4 py-8">
              <Dashboard />
            </main>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
