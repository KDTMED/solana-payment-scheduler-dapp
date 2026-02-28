import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../constants";

export function findPaymentSchedulePda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payment_schedule"), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function findPaymentRecordPda(
  schedule: PublicKey,
  index: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payment_record"), schedule.toBuffer(), Buffer.from([index])],
    PROGRAM_ID
  );
}
