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
  USDC_MINT,
  USDT_MINT,
  BN,
  Keypair,
  PublicKey,
  getAssociatedTokenAddress,
} from "./helpers";
import type { Connection } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { ScheduledTransfer } from "../src/idl/scheduled_transfer";

describe("Scheduled Transfer – full lifecycle", () => {
  let connection: Connection;
  let program: Program<ScheduledTransfer>;
  let authority: Keypair;
  let recipient: Keypair;
  let mintAuthority: Keypair;

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();
    mintAuthority = loadMintAuthority();

    await airdrop(connection, authority.publicKey);
    await airdrop(connection, recipient.publicKey);

    program = createProgram(connection, authority);
  });

  describe("initialize_counter", () => {
    it("creates a schedule counter PDA", async () => {
      const [counterPda] = findScheduleCounterPda(authority.publicKey);

      await program.methods
        .initializeCounter()
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const counter = await program.account.scheduleCounter.fetch(counterPda);
      expect(counter.authority.toBase58()).toBe(authority.publicKey.toBase58());
      expect(counter.nextId.toNumber()).toBe(0);
    });

    it("rejects duplicate counter initialization", async () => {
      await expect(
        program.methods
          .initializeCounter()
          .accounts({
            authority: authority.publicKey,
          })
          .signers([authority])
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
        .accounts({
          authority: authority.publicKey,
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
          .accounts({
            authority: authority.publicKey,
          })
          .signers([authority])
          .rpc(),
      ).rejects.toThrow();
    });

    it("rejects schedule with >50 entries", async () => {
      const now = Math.floor(Date.now() / 1000);
      const tooMany = Array.from({ length: 51 }, (_, i) => ({
        timestamp: new BN(now + 60 + i),
        amount: new BN(1_000_000),
      }));
      await expect(
        program.methods
          .initialize(tooMany, recipient.publicKey, { usdc: {} })
          .accounts({
            authority: authority.publicKey,
          })
          .signers([authority])
          .rpc(),
      ).rejects.toThrow();
    });
  });

  describe("trigger_payment", () => {
    let schedulePda: PublicKey;
    let sourceAta: PublicKey;
    let recipientAta: PublicKey;

    beforeAll(async () => {
      [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);

      // Create the PDA-owned source token account using the real USDC mint
      sourceAta = await createAndFundAta(
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
        .accounts({
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
          .accounts({
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
        .accounts({
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
      // Create a fresh schedule (schedule_id = 1 since counter was incremented)
      const now = Math.floor(Date.now() / 1000);
      await program.methods
        .initialize(
          [{ timestamp: new BN(now + 7200), amount: new BN(100_000) }],
          recipient.publicKey,
          { usdc: {} },
        )
        .accounts({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      const [freshPda] = findPaymentSchedulePda(authority.publicKey, 1n);
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        freshPda,
        true,
      );
      await createAndFundAta(
        connection,
        authority,
        USDC_MINT,
        mintAuthority,
        freshPda,
        0,
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

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();

    await airdrop(connection, authority.publicKey);
    program = createProgram(connection, authority);

    await program.methods
      .initializeCounter()
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .rpc();
  });

  it("creates multiple schedules with incrementing IDs", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payments = [
      { timestamp: new BN(now + 3600), amount: new BN(500_000) },
    ];

    await program.methods
      .initialize(payments, recipient.publicKey, { usdt: {} })
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .rpc();

    await program.methods
      .initialize(payments, recipient.publicKey, { usdc: {} })
      .accounts({ authority: authority.publicKey })
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
  let schedulePda: PublicKey;

  beforeAll(async () => {
    connection = getConnection();
    authority = Keypair.generate();
    recipient = Keypair.generate();
    mintAuthority = loadMintAuthority();

    await airdrop(connection, authority.publicKey);

    program = createProgram(connection, authority);

    await program.methods
      .initializeCounter()
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .rpc();

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .initialize(
        [{ timestamp: new BN(now + 3600), amount: new BN(5_000_000) }],
        recipient.publicKey,
        { usdc: {} },
      )
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .rpc();

    [schedulePda] = findPaymentSchedulePda(authority.publicKey, 0n);
  });

  it("check_funds fails when source account has insufficient tokens", async () => {
    // Create an empty source ATA for the PDA using real USDC mint
    const sourceAta = await createAndFundAta(
      connection,
      authority,
      USDC_MINT,
      mintAuthority,
      schedulePda,
      0,
    );

    await expect(
      program.methods
        .checkFunds()
        .accounts({
          paymentSchedule: schedulePda,
          sourceTokenAccount: sourceAta,
        })
        .signers([authority])
        .rpc(),
    ).rejects.toThrow();
  });

  it("check_funds succeeds when source account is funded", async () => {
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
      .accounts({
        paymentSchedule: schedulePda,
        sourceTokenAccount: sourceAta,
      })
      .signers([authority])
      .rpc();
  });

  it("check_gas_funds succeeds when authority has SOL", async () => {
    await program.methods
      .checkGasFunds()
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .rpc();
  });
});
