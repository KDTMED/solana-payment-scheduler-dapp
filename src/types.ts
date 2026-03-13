import { PublicKey } from "@solana/web3.js";

export type TokenType = "USDC" | "USDT";

export interface ScheduledPayment {
  timestamp: number; // unix seconds
  amount: bigint;    // raw token units
}

export interface PaymentSchedule {
  publicKey: PublicKey;
  authority: PublicKey;
  scheduleId: bigint;
  recipient: PublicKey;
  tokenType: TokenType;
  schedule: ScheduledPayment[];
  executedCount: number;
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
  solBalance: number;       // lamports
  isGasSufficient: boolean;
  usdcBalance: bigint;
  usdtBalance: bigint;
  usdcTokenAccount: PublicKey | null;
  usdtTokenAccount: PublicKey | null;
  // Set when a schedule exists; null otherwise
  requiredForNext: bigint | null;
  isSufficient: boolean;
}
