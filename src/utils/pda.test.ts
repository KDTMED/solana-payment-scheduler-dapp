// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { findScheduleCounterPda, findPaymentSchedulePda, findPaymentRecordPda } from "./pda";

const authority = new PublicKey("11111111111111111111111111111111");
const schedule = new PublicKey("So11111111111111111111111111111111111111112");

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

describe("findPaymentRecordPda", () => {
  it("returns a PublicKey and bump", () => {
    const [pda, bump] = findPaymentRecordPda(schedule, 0);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("is deterministic for the same schedule and index", () => {
    const [pda1] = findPaymentRecordPda(schedule, 0);
    const [pda2] = findPaymentRecordPda(schedule, 0);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("differs for different indices", () => {
    const [pda1] = findPaymentRecordPda(schedule, 0);
    const [pda2] = findPaymentRecordPda(schedule, 1);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("throws for index below 0", () => {
    expect(() => findPaymentRecordPda(schedule, -1)).toThrow(RangeError);
  });

  it("throws for index above 255", () => {
    expect(() => findPaymentRecordPda(schedule, 256)).toThrow(RangeError);
  });

  it("accepts boundary values 0 and 255", () => {
    expect(() => findPaymentRecordPda(schedule, 0)).not.toThrow();
    expect(() => findPaymentRecordPda(schedule, 255)).not.toThrow();
  });

  it("throws for non-integer index", () => {
    expect(() => findPaymentRecordPda(schedule, 1.5)).toThrow(RangeError);
  });
});
