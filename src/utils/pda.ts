import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../constants";

const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);

export function findScheduleCounterPda(
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("schedule_counter"), authority.toBuffer()],
    PROGRAM_ID,
  );
}

export function findProgramConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program_config")],
    PROGRAM_ID,
  );
}

export function findAuthorityRegistryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority_registry")],
    PROGRAM_ID,
  );
}

export function findProgramDataPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
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

