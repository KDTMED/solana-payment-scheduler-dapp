/**
 * Generates mint account JSON files for USDC and USDT on localnet,
 * then starts solana-test-validator with those accounts and the program cloned from devnet.
 *
 * Usage: bun integration/setup-validator.ts
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

import IDL from "../src/idl/scheduled_transfer.json";

const PROGRAM_ID = IDL.address;
const PROGRAM_SO = path.resolve(
  import.meta.dirname!,
  "../../solana-payment-scheduler-smartcontract/target/deploy/scheduled_transfer.so",
);
const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDT_MINT = "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const FIXTURES_DIR = path.join(import.meta.dirname!, "fixtures");

/**
 * Build the 82-byte SPL Token Mint account data with a given mint authority.
 * Layout: [4: COption<Pubkey> authority][32: authority pubkey][8: supply u64][1: decimals][1: is_initialized][4: COption<Pubkey> freeze][32: freeze pubkey]
 */
function buildMintData(mintAuthority: PublicKey, decimals: number): Buffer {
  const buf = Buffer.alloc(82);
  let offset = 0;

  // mint_authority: COption = Some(1)
  buf.writeUInt32LE(1, offset);
  offset += 4;
  mintAuthority.toBuffer().copy(buf, offset);
  offset += 32;

  // supply: u64 = 0
  buf.writeBigUInt64LE(0n, offset);
  offset += 8;

  // decimals
  buf.writeUInt8(decimals, offset);
  offset += 1;

  // is_initialized = true
  buf.writeUInt8(1, offset);
  offset += 1;

  // freeze_authority: COption = None(0)
  buf.writeUInt32LE(0, offset);
  // remaining 32 bytes are already zero

  return buf;
}

function writeAccountJson(
  filePath: string,
  pubkey: string,
  data: Buffer,
  owner: string,
): void {
  const json = {
    pubkey,
    account: {
      lamports: 1_461_600, // rent-exempt minimum for 82-byte mint
      data: [data.toString("base64"), "base64"],
      owner,
      executable: false,
      rentEpoch: 0,
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

// --- Main ---

fs.mkdirSync(FIXTURES_DIR, { recursive: true });

// Generate or load mint authority keypair
const mintAuthorityPath = path.join(FIXTURES_DIR, "mint-authority.json");
let mintAuthority: Keypair;
if (fs.existsSync(mintAuthorityPath)) {
  const raw = JSON.parse(fs.readFileSync(mintAuthorityPath, "utf-8"));
  mintAuthority = Keypair.fromSecretKey(Uint8Array.from(raw));
} else {
  mintAuthority = Keypair.generate();
  fs.writeFileSync(
    mintAuthorityPath,
    JSON.stringify(Array.from(mintAuthority.secretKey)),
  );
}

console.log(`Mint authority: ${mintAuthority.publicKey.toBase58()}`);

// Generate or load upgrade authority keypair (needed for admin setup in tests)
const upgradeAuthorityPath = path.join(FIXTURES_DIR, "upgrade-authority.json");
let upgradeAuthority: Keypair;
if (fs.existsSync(upgradeAuthorityPath)) {
  const raw = JSON.parse(fs.readFileSync(upgradeAuthorityPath, "utf-8"));
  upgradeAuthority = Keypair.fromSecretKey(Uint8Array.from(raw));
} else {
  upgradeAuthority = Keypair.generate();
  fs.writeFileSync(
    upgradeAuthorityPath,
    JSON.stringify(Array.from(upgradeAuthority.secretKey)),
  );
}

console.log(`Upgrade authority: ${upgradeAuthority.publicKey.toBase58()}`);

// Build USDC and USDT mint account files
const usdcData = buildMintData(mintAuthority.publicKey, 6);
const usdtData = buildMintData(mintAuthority.publicKey, 6);

const usdcPath = path.join(FIXTURES_DIR, "usdc-mint.json");
const usdtPath = path.join(FIXTURES_DIR, "usdt-mint.json");

writeAccountJson(usdcPath, USDC_MINT, usdcData, TOKEN_PROGRAM_ID);
writeAccountJson(usdtPath, USDT_MINT, usdtData, TOKEN_PROGRAM_ID);

console.log(`Wrote USDC mint fixture: ${usdcPath}`);
console.log(`Wrote USDT mint fixture: ${usdtPath}`);

// Start the validator
console.log("\nStarting solana-test-validator...");

const validator = spawn(
  "solana-test-validator",
  [
    "--upgradeable-program",
    PROGRAM_ID,
    PROGRAM_SO,
    upgradeAuthorityPath,
    "--account",
    USDC_MINT,
    usdcPath,
    "--account",
    USDT_MINT,
    usdtPath,
    "--reset",
    "--quiet",
  ],
  { stdio: "inherit" },
);

validator.on("error", (err) => {
  console.error("Failed to start validator:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  validator.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  validator.kill("SIGTERM");
  process.exit(0);
});
