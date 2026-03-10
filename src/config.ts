// src/config.ts
import { clusterApiUrl } from "@solana/web3.js";

export type Cluster = "localnet" | "devnet" | "mainnet-beta";

const RAW = (import.meta.env.VITE_SOLANA_CLUSTER ?? "devnet") as string;

function normalise(value: string): Cluster {
  const v = value.trim().toLowerCase();
  if (v === "localnet" || v === "localhost") return "localnet";
  if (v === "mainnet-beta" || v === "mainnet") return "mainnet-beta";
  return "devnet";
}

export const CLUSTER: Cluster = normalise(RAW);

export function getEndpoint(): string {
  if (CLUSTER === "localnet") return "http://127.0.0.1:8899";
  // Allow a full custom RPC URL override (useful for mainnet paid RPCs)
  const custom = import.meta.env.VITE_SOLANA_RPC_URL as string | undefined;
  if (custom) return custom;
  return clusterApiUrl(CLUSTER);
}

/** Returns the ?cluster= query param for Solana Explorer, or "" for mainnet */
export function explorerClusterParam(): string {
  if (CLUSTER === "mainnet-beta") return "";
  if (CLUSTER === "localnet") return "?cluster=custom&customUrl=http://127.0.0.1:8899";
  return `?cluster=${CLUSTER}`;
}

export function clusterLabel(): string {
  if (CLUSTER === "mainnet-beta") return "Mainnet";
  if (CLUSTER === "localnet") return "Localnet";
  return "Devnet";
}
