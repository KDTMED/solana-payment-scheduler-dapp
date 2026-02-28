import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "../idl";
import { findPaymentSchedulePda } from "../utils/pda";
import { PROGRAM_ID, TOKEN_DECIMALS } from "../constants";

interface Props {
  onSuccess: () => void;
}

interface PaymentEntry {
  date: string;
  amount: string;
}

export function InitializeForm({ onSuccess }: Props) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [recipient, setRecipient] = useState("");
  const [destAta, setDestAta] = useState("");
  const [tokenType, setTokenType] = useState<"USDC" | "USDT">("USDC");
  const [entries, setEntries] = useState<PaymentEntry[]>([
    { date: "", amount: "" },
  ]);
  const [busy, setBusy] = useState(false);

  function addEntry() {
    setEntries((e) => [...e, { date: "", amount: "" }]);
  }

  function removeEntry(i: number) {
    setEntries((e) => e.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof PaymentEntry, value: string) {
    setEntries((e) => e.map((en, idx) => (idx === i ? { ...en, [field]: value } : en)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setBusy(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = new Program(IDL as any, provider);

      const schedule = entries
        .filter((en) => en.date && en.amount)
        .map((en) => ({
          timestamp: new BN(Math.floor(new Date(en.date).getTime() / 1000)),
          amount: new BN(
            Math.round(parseFloat(en.amount) * 10 ** TOKEN_DECIMALS)
          ),
        }));

      const [schedulePda] = findPaymentSchedulePda(wallet.publicKey);

      await (program.methods as any)
        .initialize(
          schedule,
          new PublicKey(recipient),
          new PublicKey(destAta),
          { [tokenType.toLowerCase()]: {} }
        )
        .accounts({
          paymentSchedule: schedulePda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      onSuccess();
    } catch (err: any) {
      alert(err?.message ?? "Failed to initialize");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Initialize Schedule
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Recipient Address
            </label>
            <input
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Pubkey…"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Destination Token Account
            </label>
            <input
              required
              value={destAta}
              onChange={(e) => setDestAta(e.target.value)}
              placeholder="ATA Pubkey…"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Token Type</label>
          <div className="flex gap-3">
            {(["USDC", "USDT"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={t}
                  checked={tokenType === t}
                  onChange={() => setTokenType(t)}
                  className="accent-brand-500"
                />
                <span className="text-sm text-slate-300">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">Payment Entries</label>
            <button
              type="button"
              onClick={addEntry}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              + Add entry
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((en, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={en.date}
                  onChange={(e) => updateEntry(i, "date", e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={en.amount}
                  onChange={(e) => updateEntry(i, "amount", e.target.value)}
                  placeholder={`Amount (${tokenType})`}
                  className="w-36 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="text-slate-600 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-medium text-white transition-colors"
        >
          {busy ? "Creating…" : "Create Schedule"}
        </button>
      </form>
    </div>
  );
}
