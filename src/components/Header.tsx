import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Header() {
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
        </div>
        <WalletMultiButton className="!bg-brand-600 hover:!bg-brand-700 !rounded-lg !text-sm !py-2 !px-4" />
      </div>
    </header>
  );
}
