import { PublicKey } from "@solana/web3.js";

export type TokenType = "USDC" | "USDT";

export interface ScheduledPayment {
  timestamp: number; // unix seconds
  amount: bigint;    // raw token units
}

export interface PaymentSchedule {
  publicKey: PublicKey;
  authority: PublicKey;
  recipient: PublicKey;
  destinationTokenAccount: PublicKey;
  tokenType: TokenType;
  schedule: ScheduledPayment[];
  bump: number;
}

export interface PaymentRecord {
  publicKey: PublicKey;
  timestamp: number;
  amount: bigint;
  recipient: PublicKey;
  executedAt: number;
  paymentIndex: number;
  bump: number;
}

export interface FundStatus {
  tokenBalance: bigint;  // raw units
  solBalance: number;    // lamports
  requiredForNext: bigint | null;
  isSufficient: boolean;
  isGasSufficient: boolean;
  sourceTokenAccount: PublicKey | null;
}
