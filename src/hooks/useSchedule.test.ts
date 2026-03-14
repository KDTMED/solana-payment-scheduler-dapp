import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";

const mockPublicKey = new PublicKey("11111111111111111111111111111111");
const COUNTER_PDA = new PublicKey("So11111111111111111111111111111111111111112");
const SCHEDULE_PDA = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const mockConnection = {
  getAccountInfo: vi.fn(),
  getMultipleAccountsInfo: vi.fn(),
};

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: mockPublicKey }),
  useConnection: () => ({ connection: mockConnection }),
}));

vi.mock("../utils/pda", () => ({
  findScheduleCounterPda: () => [COUNTER_PDA, 255],
  findPaymentSchedulePda: () => [SCHEDULE_PDA, 254],
}));

const mockDecode = vi.fn();
vi.mock("@coral-xyz/anchor", () => ({
  BorshAccountsCoder: class {
    decode = mockDecode;
  },
}));

import { useSchedules } from "./useSchedule";

describe("useSchedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty schedules when counter account does not exist", async () => {
    mockConnection.getAccountInfo.mockResolvedValue(null);

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.schedules).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns empty schedules when next_id is 0", async () => {
    mockConnection.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(8) });
    mockDecode.mockReturnValue({ next_id: { toString: () => "0" } });

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.schedules).toEqual([]);
  });

  it("decodes and returns schedules", async () => {
    mockConnection.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(8) });

    mockDecode
      .mockReturnValueOnce({ next_id: { toString: () => "1" } }) // counter decode
      .mockReturnValueOnce({ // schedule decode
        authority: mockPublicKey,
        schedule_id: { toString: () => "0" },
        recipient: mockPublicKey,
        token_type: { USDC: {} },
        schedule: [{ timestamp: { toString: () => "1700000000" }, amount: 5_000_000n }],
        executed_count: 0,
        bump: 255,
      });

    mockConnection.getMultipleAccountsInfo.mockResolvedValue([
      { data: Buffer.alloc(100) },
    ]);

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.schedules).toHaveLength(1);
    expect(result.current.schedules[0].tokenType).toBe("USDC");
    expect(result.current.schedules[0].scheduleId).toBe(0n);
  });

  it("skips closed (null) accounts", async () => {
    mockConnection.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(8) });
    mockDecode.mockReturnValueOnce({ next_id: { toString: () => "2" } });
    mockConnection.getMultipleAccountsInfo.mockResolvedValue([null, null]);

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.schedules).toEqual([]);
  });

  it("sets error on failure", async () => {
    mockConnection.getAccountInfo.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSchedules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
  });
});
