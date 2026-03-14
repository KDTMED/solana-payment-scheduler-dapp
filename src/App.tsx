import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { getEndpoint } from "./config";
import { Header } from "./components/Header";
import { ScheduleList } from "./components/ScheduleList";
import { InitializeForm } from "./components/InitializeForm";
import { useSchedules } from "./hooks/useSchedule";
import { ScheduleDetail } from "./pages/ScheduleDetail";

function Home() {
  const { publicKey } = useWallet();
  const { schedules, loading, error, refresh } = useSchedules();

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
          Connect to view and manage your payment schedules.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-brand-500 rounded-full animate-spin" />
          Loading schedules…
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
          Your Schedules
        </h2>
        <button
          onClick={refresh}
          className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>⟳</span> Refresh
        </button>
      </div>

      <ScheduleList schedules={schedules} />
      <InitializeForm onSuccess={refresh} />
    </div>
  );
}

export default function App() {
  const endpoint = useMemo(() => getEndpoint(), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <BrowserRouter>
      <ConnectionProvider
        endpoint={endpoint}
        config={{ commitment: "confirmed" }}
      >
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="min-h-screen bg-slate-950">
              <Header />
              <main className="max-w-5xl mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/schedule/:id" element={<ScheduleDetail />} />
                </Routes>
              </main>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}
