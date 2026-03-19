import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import IDL from "../../idl/scheduled_transfer.json";
import type { ScheduledTransfer } from "../../idl/scheduled_transfer";
import { findProgramConfigPda, findProgramDataPda, findScheduleCounterPda, findAuthorityRegistryPda } from "../utils/pda";
import { useIsUpgradeAuthority } from "../hooks/useIsUpgradeAuthority";

function isValidPubkey(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export function Admin() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
  const [editingAdmins, setEditingAdmins] = useState(false);
  const [draftAdmins, setDraftAdmins] = useState<string[]>([]);
  const [newAuthority, setNewAuthority] = useState("");
  const [registeredAuthorities, setRegisteredAuthorities] = useState<string[]>([]);
  const [addingAuthority, setAddingAuthority] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isUpgradeAuthority = useIsUpgradeAuthority();
  const isAdmin = wallet.publicKey && currentAdmins.includes(wallet.publicKey.toBase58());

  const fetchConfig = useCallback(async () => {
    try {
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
        const config = program.coder.accounts.decode(
          "programConfig",
          configInfo.data,
        );
        setCurrentAdmins(
          config.admins.map((a: PublicKey) => a.toBase58()),
        );
      }

      // Fetch authority registry
      const [registryPda] = findAuthorityRegistryPda();
      const registryInfo = await connection.getAccountInfo(registryPda);
      if (registryInfo && registryInfo.data.length > 0) {
        const registry = program.coder.accounts.decode(
          "authorityRegistry",
          registryInfo.data,
        );
        setRegisteredAuthorities(
          registry.authorities.map((a: PublicKey) => a.toBase58()),
        );
      }
    } catch {
      // Config not yet created
    }
  }, [connection, wallet]);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchConfig();
    }
  }, [wallet.publicKey, fetchConfig]);

  function startEditing() {
    setDraftAdmins(currentAdmins.length > 0 ? [...currentAdmins] : [""]);
    setEditingAdmins(true);
  }

  function cancelEditing() {
    setEditingAdmins(false);
    setDraftAdmins([]);
  }

  function addAdminField() {
    setDraftAdmins((a) => [...a, ""]);
  }

  function updateAdmin(i: number, value: string) {
    setDraftAdmins((a) => a.map((v, idx) => (idx === i ? value : v)));
  }

  function removeAdminField(i: number) {
    setDraftAdmins((a) => a.filter((_, idx) => idx !== i));
  }

  async function handleSetAdmins(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) return;

    const validAdmins = draftAdmins.filter((a) => isValidPubkey(a.trim()));
    if (validAdmins.length === 0) {
      setMessage("Please enter at least one valid admin public key.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(
        IDL as unknown as ScheduledTransfer,
        provider,
      );

      const adminPubkeys = validAdmins.map(
        (a) => new PublicKey(a.trim()),
      );

      const [programData] = findProgramDataPda();
      await program.methods
        .setAdmins(adminPubkeys)
        .accounts({
          payer: wallet.publicKey,
          programData,
        })
        .rpc({ commitment: "confirmed" });

      setMessage("Admin list updated successfully.");
      setEditingAdmins(false);
      fetchConfig();
    } catch (err: any) {
      console.error("Failed to set admins:", err);
      setMessage(
        `Failed: ${err?.message || "Only the program upgrade authority can set admins."}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleInitializeAuthority(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) return;

    if (!isValidPubkey(newAuthority.trim())) {
      setMessage("Please enter a valid authority public key.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = new Program<ScheduledTransfer>(
        IDL as unknown as ScheduledTransfer,
        provider,
      );

      const authorityPubkey = new PublicKey(newAuthority.trim());
      const [counterPda] = findScheduleCounterPda(authorityPubkey);

      // Check if already initialized
      const counterInfo = await connection.getAccountInfo(counterPda);
      if (counterInfo) {
        setMessage("This authority is already registered.");
        setBusy(false);
        return;
      }

      await program.methods
        .initializeAuthority(authorityPubkey)
        .accountsPartial({
          admin: wallet.publicKey,
        })
        .rpc({ commitment: "confirmed" });

      setMessage(
        `Authority ${authorityPubkey.toBase58()} registered successfully.`,
      );
      setNewAuthority("");
      setAddingAuthority(false);
      fetchConfig();
    } catch (err: any) {
      console.error("Failed to initialize authority:", err);
      setMessage(
        `Failed: ${err?.message || "Only admins can register new authorities."}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!wallet.publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h2 className="text-xl font-semibold text-white">
          Connect your wallet
        </h2>
        <p className="text-slate-500 text-sm">
          Connect to access admin functions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
        &larr; Back to Home
      </Link>
      <h2 className="text-lg font-semibold text-white">
        Program Administration
      </h2>

      {message && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 p-3">
          <p className="text-sm text-slate-300">{message}</p>
        </div>
      )}

      {/* Current Admins */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Current Admins
          </h3>
          {isUpgradeAuthority && !editingAdmins && (
            <button
              type="button"
              onClick={startEditing}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Edit
            </button>
          )}
          {isUpgradeAuthority && editingAdmins && (
            <button
              type="button"
              onClick={cancelEditing}
              className="text-xs text-slate-500 hover:text-slate-300 font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {!editingAdmins ? (
          currentAdmins.length > 0 ? (
            <div className="space-y-1">
              {currentAdmins.map((a, i) => (
                <p key={i} className="text-xs text-slate-300 font-mono">
                  {a}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No admins configured.</p>
          )
        ) : (
          <form onSubmit={handleSetAdmins} className="space-y-3">
            {draftAdmins.map((a, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={a}
                  onChange={(e) => updateAdmin(i, e.target.value)}
                  placeholder="Admin public key…"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeAdminField(i)}
                  className="text-slate-600 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAdminField}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              + Add admin
            </button>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-medium text-white transition-colors"
            >
              {busy ? "Updating…" : "Set Admins"}
            </button>
          </form>
        )}
      </div>

      {/* Registered Authorities */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Registered Authorities
          </h3>
          {isAdmin && !addingAuthority && (
            <button
              type="button"
              onClick={() => setAddingAuthority(true)}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Add
            </button>
          )}
          {isAdmin && addingAuthority && (
            <button
              type="button"
              onClick={() => { setAddingAuthority(false); setNewAuthority(""); }}
              className="text-xs text-slate-500 hover:text-slate-300 font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {registeredAuthorities.length > 0 ? (
          <div className="space-y-1">
            {registeredAuthorities.map((a, i) => (
              <p key={i} className="text-xs text-slate-300 font-mono">
                {a}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No authorities registered.</p>
        )}

        {addingAuthority && (
          <form onSubmit={handleInitializeAuthority} className="space-y-3 mt-4 pt-4 border-t border-slate-800">
            <input
              value={newAuthority}
              onChange={(e) => setNewAuthority(e.target.value)}
              placeholder="Authority public key to register…"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
            />
            {newAuthority && !isValidPubkey(newAuthority) && (
              <p className="text-xs text-red-400">
                Invalid public key format.
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-medium text-white transition-colors"
            >
              {busy ? "Registering…" : "Register Authority"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
