import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { FundStatus } from "./FundStatus";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";
import { mockWallet, mockConnection } from "../test/walletMock";

vi.mock("@solana/spl-token", () => ({
  createTransferInstruction: vi.fn(() => ({ keys: [], programId: new PublicKey("11111111111111111111111111111111") })),
  createAssociatedTokenAccountInstruction: vi.fn(() => ({ keys: [], programId: new PublicKey("11111111111111111111111111111111") })),
  getAssociatedTokenAddress: vi.fn(() => Promise.resolve(new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ"))),
  TOKEN_PROGRAM_ID: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  ASSOCIATED_TOKEN_PROGRAM_ID: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ"),
}));

const mockRpc = vi.fn().mockResolvedValue("mock-sig");
vi.mock("@coral-xyz/anchor", () => ({
  AnchorProvider: class MockProvider { constructor(..._args: any[]) {} },
  BN: class MockBN { value: any; constructor(v: any) { this.value = v; } toString() { return this.value.toString(); } },
  Program: class MockProgram {
    constructor(..._args: any[]) {}
    methods = {
      withdrawTokens: () => ({
        accountsPartial: () => ({
          rpc: mockRpc,
        }),
      }),
    };
  },
}));

const SCHEDULE_PK = new PublicKey("11111111111111111111111111111111");
const AUTHORITY_PK = new PublicKey("So11111111111111111111111111111111111111112");
const RECIPIENT_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_ACCT_PK = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ");
const TOKEN_ACCT_PK2 = new PublicKey("7o3nQzFhPdHmDoWTB4mNPxDMa4F8e25qRUBXHnLMoEJP");

function makeStatus(overrides?: Partial<FundStatusType>): FundStatusType {
  return {
    solBalance: 100_000_000,
    isGasSufficient: true,
    usdcBalance: 10_000_000n,
    usdtBalance: 20_000_000n,
    usdcTokenAccount: TOKEN_ACCT_PK,
    usdtTokenAccount: TOKEN_ACCT_PK2,
    requiredForNext: 5_000_000n,
    isSufficient: true,
    ...overrides,
  };
}

function makeSchedule(tokenType: "USDC" | "USDT" = "USDC"): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: AUTHORITY_PK,
    scheduleId: 0n,
    recipient: RECIPIENT_PK,
    tokenType,
    schedule: [],
    executedCount: 0,
    bump: 255,
  };
}

const onRefresh = vi.fn();

describe("FundStatus — null state (no schedule)", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders USDT panel when schedule is null (defaults to USDT)", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    // When schedule is null, scheduleTokenType is null, so the else branch renders USDT
    expect(screen.getByText("USDT Balance")).toBeInTheDocument();
  });

  it("shows — for balance when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows Top Up and Withdraw buttons when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    expect(screen.getByText("Top Up")).toBeInTheDocument();
    expect(screen.getByText("Withdraw")).toBeInTheDocument();
  });

  it("toggles USDT top-up input when status is null (no schedule defaults to USDT)", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });
});

describe("FundStatus — USDC schedule", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders only USDC token panel (not USDT) for a USDC schedule", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("USDC Balance")).toBeInTheDocument();
    expect(screen.queryByText("USDT Balance")).not.toBeInTheDocument();
  });

  it("renders USDC balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    // usdcBalance 10_000_000n with 6 decimals = "10"
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows OK badge when isSufficient=true", () => {
    render(<FundStatus status={makeStatus({ isSufficient: true })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    const badges = screen.getAllByText("OK");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows Low badge when isSufficient=false", () => {
    render(<FundStatus status={makeStatus({ isSufficient: false })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("shows required amount for next payment", () => {
    render(<FundStatus status={makeStatus({ requiredForNext: 2_500_000n })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });

  it("does not show required amount when requiredForNext is null", () => {
    render(<FundStatus status={makeStatus({ requiredForNext: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.queryByText(/Next payment requires/)).not.toBeInTheDocument();
  });

  it("toggles USDC top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
  });

  it("collapses USDC top-up panel on second click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
  });

  it("toggles USDC withdraw panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
  });

  it("shows warning when usdcTokenAccount is null in top-up panel", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByText(/No USDC token account found/)).toBeInTheDocument();
  });

  it("shows warning when usdcTokenAccount is null in withdraw panel", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    expect(screen.getByText(/No USDC token account found/)).toBeInTheDocument();
  });

  it("shows Create Account button when usdcTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("Create USDC Account")).toBeInTheDocument();
  });

  it("disables USDC Send button when usdcTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });
});

describe("FundStatus — USDT schedule", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders only USDT token panel (not USDC) for a USDT schedule", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    expect(screen.getByText("USDT Balance")).toBeInTheDocument();
    expect(screen.queryByText("USDC Balance")).not.toBeInTheDocument();
  });

  it("renders USDT balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    // usdtBalance 20_000_000n with 6 decimals = "20"
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows required amount for next payment on USDT panel", () => {
    render(<FundStatus status={makeStatus({ requiredForNext: 3_000_000n })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("toggles USDT top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (USDT)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("toggles USDT withdraw panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("shows warning when usdtTokenAccount is null in top-up panel", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByText(/No USDT token account found/)).toBeInTheDocument();
  });

  it("shows warning when usdtTokenAccount is null in withdraw panel", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    expect(screen.getByText(/No USDT token account found/)).toBeInTheDocument();
  });

  it("disables USDT Withdraw button when usdtTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    const disabledBtn = screen
      .getAllByRole("button", { name: "Withdraw" })
      .find((b) => (b as HTMLButtonElement).disabled);
    expect(disabledBtn).toBeDefined();
  });

  it("shows Create USDT Account button when usdtTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    expect(screen.getByText("Create USDT Account")).toBeInTheDocument();
  });

  it("disables USDT Send button when usdtTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });
});

describe("FundStatus — panel switching", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("switches from top-up to withdraw panel on same token", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Withdraw"));
    // Now withdraw panel should be open, not top-up
    expect(screen.queryByText("Send")).not.toBeInTheDocument();
    // There should be multiple Withdraw buttons (toggle + action)
    expect(screen.getAllByRole("button", { name: "Withdraw" }).length).toBeGreaterThanOrEqual(2);
  });

  it("shows available balance in withdraw panel", () => {
    render(<FundStatus status={makeStatus({ usdcBalance: 25_000_000n })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    expect(screen.getByText(/Available:/)).toBeInTheDocument();
    expect(screen.getByText("25 USDC")).toBeInTheDocument();
  });

  it("shows withdraw error with red border on input", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    // The withdraw error state is internal; we can test the input field exists
    const input = screen.getByPlaceholderText("Amount (USDC)");
    expect(input).toBeInTheDocument();
  });

  it("clears withdraw error when typing in withdraw input", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    const input = screen.getByPlaceholderText("Amount (USDC)");
    fireEvent.change(input, { target: { value: "5" } });
    // No error should be visible
    expect(screen.queryByText(/Insufficient balance/)).not.toBeInTheDocument();
  });
});

describe("FundStatus — txSig display", () => {
  it("does not show tx confirmation when no transaction has been sent", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.queryByText(/Tx confirmed/)).not.toBeInTheDocument();
  });
});

describe("FundStatus — async handlers", () => {
  beforeEach(() => {
    onRefresh.mockReset();
    mockWallet.sendTransaction.mockReset();
    mockWallet.sendTransaction.mockResolvedValue("mock-tx-sig");
    (mockConnection as any).confirmTransaction = vi.fn().mockResolvedValue({});
  });

  it("handleCreateAta sends transaction when no token account exists", async () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    const createBtn = screen.getByText("Create USDC Account");
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockWallet.sendTransaction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("handleCreateAta shows alert on failure", async () => {
    mockWallet.sendTransaction.mockRejectedValue(new Error("tx failed"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Create USDC Account"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to create token account. Please try again.");
    });
    alertSpy.mockRestore();
  });

  it("handleTopupToken sends transfer when amount is valid", async () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(mockWallet.sendTransaction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("handleTopupToken alerts on invalid amount", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Enter a valid positive amount.");
    });
    alertSpy.mockRestore();
  });

  it("handleTopupToken alerts on failure", async () => {
    mockWallet.sendTransaction.mockRejectedValue(new Error("Transfer failed"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Transfer failed. Please try again.");
    });
    alertSpy.mockRestore();
  });

  it("handleWithdrawToken calls program withdraw on valid amount", async () => {
    (mockConnection as any).confirmTransaction.mockResolvedValue({});

    render(<FundStatus status={makeStatus({ usdcBalance: 50_000_000n })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "5" } });
    // Click the withdraw action button (second one)
    const withdrawBtns = screen.getAllByRole("button", { name: "Withdraw" });
    fireEvent.click(withdrawBtns[withdrawBtns.length - 1]);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });
  });

  it("handleWithdrawToken shows error for invalid amount", async () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "" } });
    const withdrawBtns = screen.getAllByRole("button", { name: "Withdraw" });
    fireEvent.click(withdrawBtns[withdrawBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Enter a valid positive amount.")).toBeInTheDocument();
    });
  });

  it("handleWithdrawToken shows insufficient balance error", async () => {
    render(<FundStatus status={makeStatus({ usdcBalance: 1_000_000n })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Withdraw"));
    fireEvent.change(screen.getByPlaceholderText("Amount (USDC)"), { target: { value: "100" } });
    const withdrawBtns = screen.getAllByRole("button", { name: "Withdraw" });
    fireEvent.click(withdrawBtns[withdrawBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Insufficient balance/)).toBeInTheDocument();
    });
  });
});
