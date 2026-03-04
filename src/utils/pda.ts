import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../constants";

export function findPaymentSchedulePda(
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payment_schedule"), authority.toBuffer()],
    PROGRAM_ID,
  );
}

export function findPaymentRecordPda(
  schedule: PublicKey,
  index: number,
): [PublicKey, number] {
  // FIX 10: Validate that index fits in a u8 to prevent silent
  // wrapping via Buffer.from([index]).  The on-chain program uses a
  // u8 for payment_index.
  if (!Number.isInteger(index) || index < 0 || index > 255) {
    throw new RangeError(
      `Payment record index must be 0–255, got ${index}`,
    );
  }

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_record"),
      schedule.toBuffer(),
      Buffer.from([index]),
    ],
    PROGRAM_ID,
  );
}
