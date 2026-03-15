import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import IDL from "../idl/scheduled_transfer.json";
import type { ScheduledTransfer } from "../idl/scheduled_transfer";
import {
  TOKEN_DECIMALS,
  MAX_SCHEDULE_ENTRIES,
} from "../constants";
import { findScheduleCounterPda, findPaymentSchedulePda } from "../utils/pda";

interface Props {
  onSuccess: () => void;
}

interface PaymentEntry {
  date: string;
  amount: string;
}

/**
 * Parse a decimal token string into raw u64 units without
 * floating-point precision loss.
 */
function parseTokenAmount(
  input: string,
  decimals: number,
): bigint | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === ".") return null;

  const parts = trimmed.split(".");
  if (parts.length > 2) return null;

  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);

  try {
    const value =
      BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}

/**
 * Validate that a string is a valid Solana public key.
 */
function isValidPubkey(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export function InitializeForm({ onSuccess }: Props) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [recipient, setRecipient] = useState("");
  const [tokenType, setTokenType] = useState<"USDC" | "USDT">("USDC");
  const [entries, setEntries] = useState<PaymentEntry[]>([
    { date: "", amount: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function addEntry() {
    // FIX 6: Enforce MAX_SCHEDULE_ENTRIES on the client side
    if (entries.length >= MAX_SCHEDULE_ENTRIES) {
      alert(`Maximum of ${MAX_SCHEDULE_ENTRIES} payment entries allowed.`);
      return;
    }
    setEntries((e) => [...e, { date: "", amount: "" }]);
  }

  function removeEntry(i: number) {
    setEntries((e) => e.filter((_, idx) => idx !== i));
  }

  function updateEntry(
    i: number,
    field: keyof PaymentEntry,
    value: string,
  ) {
    setEntries((e) =>
      e.map((en, idx) => (idx === i ? { ...en, [field]: value } : en)),
    );
  }

  function validate(): string[] {
    const errors: string[] = [];

    // Validate recipient
    if (!isValidPubkey(recipient)) {
      errors.push("Invalid recipient public key.");
    }

    // Validate that recipient is not the user's own wallet
    if (
      wallet.publicKey &&
      isValidPubkey(recipient) &&
      new PublicKey(recipient).equals(wallet.publicKey)
    ) {
      errors.push("Recipient cannot be your own wallet.");
    }

    const validEntries = entries.filter((en) => en.date && en.amount);

    if (validEntries.length === 0) {
      errors.push("Add at least one payment entry.");
    }

    if (validEntries.length > MAX_SCHEDULE_ENTRIES) {
      errors.push(
        `Maximum of ${MAX_SCHEDULE_ENTRIES} payment entries allowed.`,
      );
    }

    const now = Date.now() / 1000;
    for (let i = 0; i < validEntries.length; i++) {
      const en = validEntries[i];
      const ts = Math.floor(new Date(en.date).getTime() / 1000);

      // FIX 7: Reject dates in the past
      if (ts <= now) {
        errors.push(
          `Entry ${i + 1}: Scheduled date must be in the future.`,
        );
      }

      // FIX 8: Use safe integer parsing
      const amount = parseTokenAmount(en.amount, TOKEN_DECIMALS);
      if (amount === null) {
        errors.push(
          `Entry ${i + 1}: Invalid or zero amount.`,
        );
      }
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) return;

    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setBusy(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(IDL as unknown as ScheduledTransfer, provider);

      // FIX 8: Use integer-safe parsing for amounts
      const schedule = entries
        .filter((en) => en.date && en.amount)
        .map((en) => {
          const amount = parseTokenAmount(en.amount, TOKEN_DECIMALS)!;
          return {
            timestamp: new BN(
              Math.floor(new Date(en.date).getTime() / 1000),
            ),
            amount: new BN(amount.toString()),
          };
        });

      // initialize_counter must be called once per authority before creating
      // the first schedule. Check if the counter PDA already exists.
      const [counterPda] = findScheduleCounterPda(wallet.publicKey);
      const counterInfo = await connection.getAccountInfo(counterPda);
      let nextId = 0n;
      if (!counterInfo) {
        await program.methods
          .initializeCounter()
          .accounts({ authority: wallet.publicKey })
          .rpc({ commitment: "confirmed" });
        // Freshly created counter starts at 0
      } else {
        const counter = program.coder.accounts.decode("scheduleCounter", counterInfo.data);
        nextId = BigInt(counter.nextId.toString());
      }

      const [paymentSchedulePda] = findPaymentSchedulePda(wallet.publicKey, nextId);

      await program.methods
        .initialize(
          schedule,
          new PublicKey(recipient),
          { [tokenType.toLowerCase()]: {} },
        )
        .accountsPartial({
          authority: wallet.publicKey,
          scheduleCounter: counterPda,
          paymentSchedule: paymentSchedulePda,
        })
        .rpc();

      onSuccess();
    } catch (err: any) {
      console.error("Failed to initialize schedule:", err);
      alert("Failed to create schedule. Please try again.");
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
        {validationErrors.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-xs text-red-400">
                {err}
              </p>
            ))}
          </div>
        )}

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
          {recipient && !isValidPubkey(recipient) && (
            <p className="mt-1 text-xs text-red-400">
              Invalid public key format.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Token Type
          </label>
          <div className="flex gap-3">
            {(["USDC", "USDT"] as const).map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 cursor-pointer"
              >
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
            <label className="text-xs text-slate-500">
              Payment Entries{" "}
              <span className="text-slate-600">
                ({entries.length}/{MAX_SCHEDULE_ENTRIES})
              </span>
            </label>
            <button
              type="button"
              onClick={addEntry}
              disabled={entries.length >= MAX_SCHEDULE_ENTRIES}
              className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onChange={(e) =>
                    updateEntry(i, "date", e.target.value)
                  }
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={en.amount}
                  onChange={(e) =>
                    updateEntry(i, "amount", e.target.value)
                  }
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
