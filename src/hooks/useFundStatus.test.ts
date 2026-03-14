import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { PaymentSchedule } from "../types";

const mockPublicKey = new PublicKey("11111111111111111111111111111111");
const SCHEDULE_PK = new PublicKey("So11111111111111111111111111111111111111112");
const ATA_PK = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ");

const mockConnection = {
  getBalance: vi.fn(),
};

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: mockPublicKey }),
  useConnection: () => ({ connection: mockConnection }),
}));

const mockGetAccount = vi.fn();

vi.mock("@solana/spl-token", () => ({
  getAccount: (...args: any[]) => mockGetAccount(...args),
  getAssociatedTokenAddress: () => Promise.resolve(ATA_PK),
}));

import { useFundStatus } from "./useFundStatus";

function makeSchedule(tokenType: "USDC" | "USDT" = "USDC"): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: mockPublicKey,
    scheduleId: 0n,
    recipient: mockPublicKey,
    tokenType,
    schedule: [{ timestamp: 1700000000, amount: 5_000_000n }],
    executedCount: 0,
    bump: 255,
  };
}

describe("useFundStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null status when schedule is null", async () => {
    const { result } = renderHook(() => useFundStatus(null));

    await waitFor(() => {
      expect(result.current.status).toBeNull();
    });
  });

  it("fetches fund status for a schedule", async () => {
    mockConnection.getBalance.mockResolvedValue(100_000_000);
    // getAccount is called twice: once for USDC ATA, once for USDT ATA
    mockGetAccount.mockResolvedValue({ amount: 10_000_000n });

    const { result } = renderHook(() => useFundStatus(makeSchedule("USDC")));

    await waitFor(() => {
      expect(result.current.status).not.toBeNull();
    });

    expect(result.current.status!.solBalance).toBe(100_000_000);
    // Both USDC and USDT get the same mock value
    expect(result.current.status!.usdcBalance).toBe(10_000_000n);
    expect(result.current.status!.isSufficient).toBe(true);
    expect(result.current.status!.isGasSufficient).toBe(true);
    expect(result.current.status!.requiredForNext).toBe(5_000_000n);
  });

  it("handles missing token accounts gracefully", async () => {
    mockConnection.getBalance.mockResolvedValue(100_000_000);
    mockGetAccount.mockRejectedValue(new Error("Account not found"));

    const { result } = renderHook(() => useFundStatus(makeSchedule()));

    await waitFor(() => {
      expect(result.current.status).not.toBeNull();
    });

    expect(result.current.status!.usdcBalance).toBe(0n);
    expect(result.current.status!.usdtBalance).toBe(0n);
    expect(result.current.status!.usdcTokenAccount).toBeNull();
    expect(result.current.status!.usdtTokenAccount).toBeNull();
  });

  it("marks gas as insufficient when SOL balance is low", async () => {
    mockConnection.getBalance.mockResolvedValue(1_000);
    mockGetAccount.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useFundStatus(makeSchedule()));

    await waitFor(() => {
      expect(result.current.status).not.toBeNull();
    });

    expect(result.current.status!.isGasSufficient).toBe(false);
  });

  it("marks insufficient when balance < requiredForNext", async () => {
    mockConnection.getBalance.mockResolvedValue(100_000_000);
    // Both accounts return low balance
    mockGetAccount.mockResolvedValue({ amount: 1_000_000n });

    const { result } = renderHook(() => useFundStatus(makeSchedule("USDC")));

    await waitFor(() => {
      expect(result.current.status).not.toBeNull();
    });

    expect(result.current.status!.isSufficient).toBe(false);
  });
});
