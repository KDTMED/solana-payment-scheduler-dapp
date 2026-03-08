import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatTokenAmount,
  formatSol,
  isOverdue,
  durationFromNow,
} from "./format";

describe("formatTokenAmount", () => {
  it("formats whole number amounts", () => {
    expect(formatTokenAmount(1_000_000n)).toBe("1");
  });

  it("formats amounts with fractional part", () => {
    expect(formatTokenAmount(1_500_000n)).toBe("1.5");
  });

  it("formats zero", () => {
    expect(formatTokenAmount(0n)).toBe("0");
  });

  it("trims trailing zeros in fractional part", () => {
    expect(formatTokenAmount(1_100_000n)).toBe("1.1");
  });

  it("respects custom decimals", () => {
    expect(formatTokenAmount(1_000_000_000n, 9)).toBe("1");
  });

  it("formats large amounts", () => {
    expect(formatTokenAmount(1_000_000_000_000n)).toBe("1000000");
  });
});

describe("formatSol", () => {
  it("converts lamports to SOL with 4 decimal places", () => {
    expect(formatSol(1_000_000_000)).toBe("1.0000");
  });

  it("formats fractional SOL", () => {
    expect(formatSol(500_000_000)).toBe("0.5000");
  });

  it("formats zero", () => {
    expect(formatSol(0)).toBe("0.0000");
  });
});

describe("isOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  it("returns true for past timestamps", () => {
    const past = Math.floor(new Date("2024-01-01T11:00:00Z").getTime() / 1000);
    expect(isOverdue(past)).toBe(true);
  });

  it("returns false for future timestamps", () => {
    const future = Math.floor(new Date("2024-01-01T13:00:00Z").getTime() / 1000);
    expect(isOverdue(future)).toBe(false);
  });
});

describe("durationFromNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  it("returns 'Overdue' for past timestamps", () => {
    const past = Math.floor(new Date("2024-01-01T11:00:00Z").getTime() / 1000);
    expect(durationFromNow(past)).toBe("Overdue");
  });

  it("formats minutes-only duration", () => {
    const soon = Math.floor(new Date("2024-01-01T12:30:00Z").getTime() / 1000);
    expect(durationFromNow(soon)).toBe("in 30m");
  });

  it("formats hours and minutes duration", () => {
    const later = Math.floor(new Date("2024-01-01T14:30:00Z").getTime() / 1000);
    expect(durationFromNow(later)).toBe("in 2h 30m");
  });

  it("formats multi-day duration", () => {
    const future = Math.floor(new Date("2024-01-04T12:00:00Z").getTime() / 1000);
    expect(durationFromNow(future)).toBe("in 3d 0h");
  });
});
