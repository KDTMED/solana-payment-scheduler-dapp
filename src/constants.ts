import { PublicKey } from "@solana/web3.js";
import { CLUSTER } from "./config";

export const PROGRAM_ID = new PublicKey(
  "5BhDb1YqZq8f9yED9rphTobT4zB25cwWWqLaZtYWCJd4",
);

export const TOKEN_DECIMALS = 6;

// Minimum SOL balance considered safe (0.05 SOL in lamports)
export const MIN_GAS_LAMPORTS = 50_000_000n;

// Max schedule entries the contract allows
export const MAX_SCHEDULE_ENTRIES = 50;

// --- Mints per cluster ---

const USDC_MINTS: Record<string, string> = {
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  localnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // reuse devnet for local
};

const USDT_MINTS: Record<string, string> = {
  "mainnet-beta": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  devnet: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS",
  localnet: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS",
};

export const USDC_MINT = new PublicKey(USDC_MINTS[CLUSTER]);
export const USDT_MINT = new PublicKey(USDT_MINTS[CLUSTER]);
