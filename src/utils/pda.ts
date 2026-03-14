import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../constants";

export function findScheduleCounterPda(
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("schedule_counter"), authority.toBuffer()],
    PROGRAM_ID,
  );
}

export function findPaymentSchedulePda(
  authority: PublicKey,
  scheduleId: bigint,
): [PublicKey, number] {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(scheduleId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payment_schedule"), authority.toBuffer(), idBuf],
    PROGRAM_ID,
  );
}

