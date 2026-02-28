import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "9AYYXREwPQu7pRhnfsYr1pRy194zdJ4fTb55FhRCMvLb"
);

export const TOKEN_DECIMALS = 6;

// Minimum SOL balance considered safe (0.05 SOL in lamports)
export const MIN_GAS_LAMPORTS = 50_000_000n;

// Max schedule entries the contract allows
export const MAX_SCHEDULE_ENTRIES = 50;

export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const USDT_MINT_DEVNET = new PublicKey(
  "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS"
);
