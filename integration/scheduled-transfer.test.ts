/**
 * Integration tests for the Scheduled Transfer program.
 *
 * Prerequisites:
 *   1. Run the validator setup (generates mint fixtures and starts validator):
 *        bun integration/setup-validator.ts
 *
 *   2. In another terminal, run the tests:
 *        bun run test:integration
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getConnection,
  createProgram,
  airdrop,
  createAndFundAta,
  getTokenBalance,
  findScheduleCounterPda,
  findPaymentSchedulePda,
  loadMintAuthority,
  loadUpgradeAuthority,
  registerAuthority,
  USDC_MINT,
  USDT_MINT,
  BN,
  Keypair,
  PublicKey,
  getAssociatedTokenAddress,
} from "./helpers";
import type { Connection } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { ScheduledTransfer } from "../idl/scheduled_transfer";

describe("Scheduled Transfer – full lifecycle", () => {
  let connection: Connection;
  let program: Program<ScheduledTransfer>;
  let authority: Keypair;
  let recipient: Keypair;
  let mintAuthority: Keypair;
  let upgradeAuthority: Keypair;

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();
    mintAuthority = loadMintAuthority();
    upgradeAuthority = loadUpgradeAuthority();

    await airdrop(connection, authority.publicKey);
    await airdrop(connection, recipient.publicKey);
    await airdrop(connection, upgradeAuthority.publicKey);

    program = createProgram(connection, authority);

    // Register authority via admin flow
    await registerAuthority(program, upgradeAuthority, upgradeAuthority, authority.publicKey);
  });

  describe("initialize_authority", () => {
    it("creates a schedule counter PDA", async () => {
      const [counterPda] = findScheduleCounterPda(authority.publicKey);

      const counter = await program.account.scheduleCounter.fetch(counterPda);
      expect(counter.authority.toBase58()).toBe(authority.publicKey.toBase58());
      expect(counter.nextId.toNumber()).toBe(0);
    });

    it("rejects duplicate authority initialization", async () => {
      const adminProgram = createProgram(connection, upgradeAuthority);
      await expect(
        adminProgram.methods
          .initializeAuthority(authority.publicKey)
          .accountsPartial({ admin: upgradeAuthority.publicKey })
          .signers([upgradeAuthority])
          .rpc(),
      ).rejects.toThrow();
    });

    it("rejects non-admin callers", async () => {
      const nonAdmin = Keypair.generate();
      await airdrop(connection, nonAdmin.publicKey);
      const nonAdminProgram = createProgram(connection, nonAdmin);
      const newAuthority = Keypair.generate();
      await expect(
        nonAdminProgram.methods
          .initializeAuthority(newAuthority.publicKey)
          .accountsPartial({ admin: nonAdmin.publicKey })
          .signers([nonAdmin])
          .rpc(),
      ).rejects.toThrow();
    });
  });

  describe("initialize schedule", () => {
    it("creates a payment schedule with two entries", async () => {
      const now = Math.floor(Date.now() / 1000);
      const payments = [
        { timestamp: new BN(now + 2), amount: new BN(1_000_000) },
        { timestamp: new BN(now + 3600), amount: new BN(2_000_000) },
      ];

      await program.methods
        .initialize(payments, recipient.publicKey, { usdc: {} })
        .accountsPartial({
          authority: authority.publicKey,
          mint: USDC_MINT,
        })
        .signers([authority])
        .rpc();

      const [counterPda] = findScheduleCounterPda(authority.publicKey);
      const counter = await program.account.scheduleCounter.fetch(counterPda);
      expect(counter.nextId.toNumber()).toBe(1);

      const [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);
      const schedule =
        await program.account.paymentSchedule.fetch(schedulePda);
      expect(schedule.authority.toBase58()).toBe(
        authority.publicKey.toBase58(),
      );
      expect(schedule.recipient.toBase58()).toBe(
        recipient.publicKey.toBase58(),
      );
      expect(schedule.schedule.length).toBe(2);
      expect(schedule.executedCount).toBe(0);
    });

    it("rejects zero-amount payments", async () => {
      const now = Math.floor(Date.now() / 1000);
      await expect(
        program.methods
          .initialize(
            [{ timestamp: new BN(now + 60), amount: new BN(0) }],
            recipient.publicKey,
            { usdc: {} },
          )
          .accountsPartial({
            authority: authority.publicKey,
            mint: USDC_MINT,
          })
          .signers([authority])
          .rpc(),
      ).rejects.toThrow();
    });

    it("accepts more than 50 schedules (no fixed limit)", async () => {
      const now = Math.floor(Date.now() / 1000);

      // Create 50 more schedules (schedule IDs 1–50) to exceed the old cap
      for (let i = 1; i <= 50; i++) {
        await program.methods
          .initialize(
            [{ timestamp: new BN(now + 3600 + i), amount: new BN(1_000_000) }],
            recipient.publicKey,
            { usdc: {} },
          )
          .accountsPartial({
            authority: authority.publicKey,
            mint: USDC_MINT,
          })
          .signers([authority])
          .rpc();
      }

      const [counterPda] = findScheduleCounterPda(authority.publicKey);
      const counter = await program.account.scheduleCounter.fetch(counterPda);
      expect(counter.nextId.toNumber()).toBe(51);

      const [schedulePda] = findPaymentSchedulePda(authority.publicKey, 50n);
      const schedule =
        await program.account.paymentSchedule.fetch(schedulePda);
      expect(schedule.schedule.length).toBe(1);
    });
  });

  describe("trigger_payment", () => {
    let schedulePda: PublicKey;
    let sourceAta: PublicKey;
    let recipientAta: PublicKey;

    beforeAll(async () => {
      [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);

      // The source ATA was auto-created by initialize; fund it with tokens
      sourceAta = await getAssociatedTokenAddress(USDC_MINT, schedulePda, true);
      await createAndFundAta(
        connection,
        authority,
        USDC_MINT,
        mintAuthority,
        schedulePda,
        10_000_000, // 10 USDC
      );

      // Create recipient ATA for USDC
      recipientAta = await createAndFundAta(
        connection,
        authority,
        USDC_MINT,
        mintAuthority,
        recipient.publicKey,
        0,
      );
    });

    it("executes a due payment", async () => {
      // Wait for the first payment to become due (2s from creation)
      await new Promise((r) => setTimeout(r, 3000));

      const balanceBefore = await getTokenBalance(connection, recipientAta);

      await program.methods
        .triggerPayment(0)
        .accountsPartial({
          paymentSchedule: schedulePda,
          sourceTokenAccount: sourceAta,
          destinationTokenAccount: recipientAta,
        })
        .signers([authority])
        .rpc();

      const balanceAfter = await getTokenBalance(connection, recipientAta);
      expect(balanceAfter - balanceBefore).toBe(1_000_000n);

      const schedule =
        await program.account.paymentSchedule.fetch(schedulePda);
      expect(schedule.executedCount).toBe(1);
    });

    it("rejects trigger when no payment is due", async () => {
      await expect(
        program.methods
          .triggerPayment(1)
          .accountsPartial({
            paymentSchedule: schedulePda,
            sourceTokenAccount: sourceAta,
            destinationTokenAccount: recipientAta,
          })
          .signers([authority])
          .rpc(),
      ).rejects.toThrow();
    });
  });

  describe("withdraw_tokens", () => {
    it("withdraws tokens from the PDA source account", async () => {
      const [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        schedulePda,
        true,
      );
      const authorityAta = await createAndFundAta(
        connection,
        authority,
        USDC_MINT,
        mintAuthority,
        authority.publicKey,
        0,
      );

      const balanceBefore = await getTokenBalance(connection, sourceAta);

      await program.methods
        .withdrawTokens(new BN(1_000_000))
        .accountsPartial({
          paymentSchedule: schedulePda,
          sourceTokenAccount: sourceAta,
          destinationTokenAccount: authorityAta,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const balanceAfter = await getTokenBalance(connection, sourceAta);
      expect(balanceBefore - balanceAfter).toBe(1_000_000n);

      const authorityBalance = await getTokenBalance(connection, authorityAta);
      expect(authorityBalance).toBe(1_000_000n);
    });
  });

  describe("close", () => {
    it("closes a fresh schedule and returns rent", async () => {
      // Read counter to determine what ID the next schedule will get
      const [counterPda] = findScheduleCounterPda(authority.publicKey);
      const counterBefore = await program.account.scheduleCounter.fetch(counterPda);
      const freshId = BigInt(counterBefore.nextId.toString());

      const now = Math.floor(Date.now() / 1000);
      await program.methods
        .initialize(
          [{ timestamp: new BN(now + 7200), amount: new BN(100_000) }],
          recipient.publicKey,
          { usdc: {} },
        )
        .accountsPartial({
          authority: authority.publicKey,
          mint: USDC_MINT,
        })
        .signers([authority])
        .rpc();

      const [freshPda] = findPaymentSchedulePda(authority.publicKey, freshId);
      // The source ATA was auto-created by initialize
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        freshPda,
        true,
      );
      const destAta = await getAssociatedTokenAddress(
        USDC_MINT,
        authority.publicKey,
      );

      const solBefore = await connection.getBalance(authority.publicKey);

      await program.methods
        .close()
        .accountsPartial({
          paymentSchedule: freshPda,
          sourceTokenAccount: sourceAta,
          destinationTokenAccount: destAta,
          authority: authority.publicKey,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        })
        .signers([authority])
        .rpc();

      const solAfter = await connection.getBalance(authority.publicKey);
      expect(solAfter).toBeGreaterThan(solBefore - 100_000);

      const info = await connection.getAccountInfo(freshPda);
      expect(info).toBeNull();
    });
  });
});

describe("Scheduled Transfer – multiple schedules", () => {
  let connection: Connection;
  let program: Program<ScheduledTransfer>;
  let authority: Keypair;
  let recipient: Keypair;
  let upgradeAuthority: Keypair;

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();
    upgradeAuthority = loadUpgradeAuthority();

    await airdrop(connection, authority.publicKey);
    await airdrop(connection, upgradeAuthority.publicKey);
    program = createProgram(connection, authority);

    await registerAuthority(program, upgradeAuthority, upgradeAuthority, authority.publicKey);
  });

  it("creates multiple schedules with incrementing IDs", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payments = [
      { timestamp: new BN(now + 3600), amount: new BN(500_000) },
    ];

    await program.methods
      .initialize(payments, recipient.publicKey, { usdt: {} })
      .accountsPartial({ authority: authority.publicKey, mint: USDT_MINT })
      .signers([authority])
      .rpc();

    await program.methods
      .initialize(payments, recipient.publicKey, { usdc: {} })
      .accountsPartial({ authority: authority.publicKey, mint: USDC_MINT })
      .signers([authority])
      .rpc();

    const [counterPda] = findScheduleCounterPda(authority.publicKey);
    const counter = await program.account.scheduleCounter.fetch(counterPda);
    expect(counter.nextId.toNumber()).toBe(2);

    const [pda0] = findPaymentSchedulePda(authority.publicKey, 0n);
    const [pda1] = findPaymentSchedulePda(authority.publicKey, 1n);

    const sched0 = await program.account.paymentSchedule.fetch(pda0);
    const sched1 = await program.account.paymentSchedule.fetch(pda1);

    expect(sched0.scheduleId.toNumber()).toBe(0);
    expect(sched1.scheduleId.toNumber()).toBe(1);
    expect(sched0.tokenType).toEqual({ usdt: {} });
    expect(sched1.tokenType).toEqual({ usdc: {} });
  });
});

describe("Scheduled Transfer – check_funds and check_gas_funds", () => {
  let connection: Connection;
  let program: Program<ScheduledTransfer>;
  let authority: Keypair;
  let recipient: Keypair;
  let mintAuthority: Keypair;
  let upgradeAuthority: Keypair;
  let schedulePda: PublicKey;

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();
    mintAuthority = loadMintAuthority();
    upgradeAuthority = loadUpgradeAuthority();

    await airdrop(connection, authority.publicKey);
    await airdrop(connection, upgradeAuthority.publicKey);

    program = createProgram(connection, authority);

    await registerAuthority(program, upgradeAuthority, upgradeAuthority, authority.publicKey);

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .initialize(
        [{ timestamp: new BN(now + 3600), amount: new BN(5_000_000) }],
        recipient.publicKey,
        { usdc: {} },
      )
      .accountsPartial({
        authority: authority.publicKey,
        mint: USDC_MINT,
      })
      .signers([authority])
      .rpc();

    [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);
  });

  it("check_funds fails when source account has insufficient tokens", async () => {
    // The source ATA was auto-created by initialize with zero balance
    const sourceAta = await getAssociatedTokenAddress(USDC_MINT, schedulePda, true);

    await expect(
      program.methods
        .checkFunds()
        .accountsPartial({
          paymentSchedule: schedulePda,
          sourceTokenAccount: sourceAta,
        })
        .signers([authority])
        .rpc(),
    ).rejects.toThrow();
  });

  it("check_funds succeeds when source account is funded", async () => {
    // Fund the existing source ATA
    const sourceAta = await createAndFundAta(
      connection,
      authority,
      USDC_MINT,
      mintAuthority,
      schedulePda,
      10_000_000,
    );

    await program.methods
      .checkFunds()
      .accountsPartial({
        paymentSchedule: schedulePda,
        sourceTokenAccount: sourceAta,
      })
      .signers([authority])
      .rpc();
  });

  it("check_gas_funds succeeds when authority has SOL", async () => {
    await program.methods
      .checkGasFunds()
      .accountsPartial({ authority: authority.publicKey })
      .signers([authority])
      .rpc();
  });
});
