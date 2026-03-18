import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { usePhantomAccountChange } from "./usePhantomAccountChange";

const mockPublicKey = new PublicKey(
  "EkJpRbvTaeLyYTr6Cod2sehMTs7rRLfLtwoqV6Kf2G7L",
);
const otherPublicKey = new PublicKey(
  "5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CerPntm1RjX",
);

const mockEmit = vi.fn();

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: mockPublicKey,
    wallet: { adapter: { emit: mockEmit } },
  }),
}));

describe("usePhantomAccountChange", () => {
  let mockPhantomConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPhantomConnect = vi.fn().mockResolvedValue({
      publicKey: { toBytes: () => mockPublicKey.toBytes() },
    });
    (window as any).phantom = {
      solana: { connect: mockPhantomConnect },
    };
    mockEmit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).phantom;
  });

  it("does nothing when the account has not changed", async () => {
    renderHook(() => usePhantomAccountChange(500));
    await vi.advanceTimersByTimeAsync(600);

    expect(mockPhantomConnect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("emits connect on the adapter with the new public key", async () => {
    renderHook(() => usePhantomAccountChange(500));

    // First poll — same key
    await vi.advanceTimersByTimeAsync(600);
    expect(mockEmit).not.toHaveBeenCalled();

    // Change the account
    mockPhantomConnect.mockResolvedValue({
      publicKey: { toBytes: () => otherPublicKey.toBytes() },
    });

    await vi.advanceTimersByTimeAsync(600);
    expect(mockEmit).toHaveBeenCalledWith(
      "connect",
      expect.objectContaining({
        toBase58: expect.any(Function),
      }),
    );
    // Verify it's the right key
    const emittedKey = mockEmit.mock.calls[0][1] as PublicKey;
    expect(emittedKey.toBase58()).toBe(otherPublicKey.toBase58());
  });

  it("does not poll when phantom is not available", async () => {
    delete (window as any).phantom;
    renderHook(() => usePhantomAccountChange(500));
    await vi.advanceTimersByTimeAsync(600);

    expect(mockEmit).not.toHaveBeenCalled();
  });
});
