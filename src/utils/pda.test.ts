// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { findScheduleCounterPda, findPaymentSchedulePda } from "./pda";

const authority = new PublicKey("11111111111111111111111111111111");

describe("findScheduleCounterPda", () => {
  it("returns a PublicKey and bump", () => {
    const [pda, bump] = findScheduleCounterPda(authority);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("is deterministic for the same authority", () => {
    const [pda1] = findScheduleCounterPda(authority);
    const [pda2] = findScheduleCounterPda(authority);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("differs for different authorities", () => {
    const other = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const [pda1] = findScheduleCounterPda(authority);
    const [pda2] = findScheduleCounterPda(other);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });
});

describe("findPaymentSchedulePda", () => {
  it("returns a PublicKey and bump", () => {
    const [pda, bump] = findPaymentSchedulePda(authority, 0n);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("is deterministic for the same authority and scheduleId", () => {
    const [pda1] = findPaymentSchedulePda(authority, 0n);
    const [pda2] = findPaymentSchedulePda(authority, 0n);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("differs for different authorities", () => {
    const other = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const [pda1] = findPaymentSchedulePda(authority, 0n);
    const [pda2] = findPaymentSchedulePda(other, 0n);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("differs for different scheduleIds", () => {
    const [pda1] = findPaymentSchedulePda(authority, 0n);
    const [pda2] = findPaymentSchedulePda(authority, 1n);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });
});

