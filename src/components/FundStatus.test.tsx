import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { FundStatus } from "./FundStatus";
import { FundStatus as FundStatusType, PaymentSchedule } from "../types";

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

  it("renders USDT panel and SOL panel when schedule is null (defaults to USDT)", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    // When schedule is null, scheduleTokenType is null, so the else branch renders USDT
    expect(screen.getByText("USDT Balance")).toBeInTheDocument();
    expect(screen.getByText("SOL Balance")).toBeInTheDocument();
  });

  it("shows — for balances when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Top Up and Withdraw buttons for both panels when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    expect(screen.getAllByText("Top Up")).toHaveLength(2);
    expect(screen.getAllByText("Withdraw")).toHaveLength(2);
  });

  it("toggles USDT top-up input when status is null (no schedule defaults to USDT)", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("toggles SOL top-up input when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[1]);
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
  });

  it("toggles SOL withdraw input when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[1]);
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
    expect(screen.getByText(/Rent-exempt minimum/)).toBeInTheDocument();
  });
});

describe("FundStatus — USDC schedule", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders only USDC token panel (not USDT) for a USDC schedule", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("USDC Balance")).toBeInTheDocument();
    expect(screen.queryByText("USDT Balance")).not.toBeInTheDocument();
    expect(screen.getByText("SOL Balance")).toBeInTheDocument();
  });

  it("renders USDC balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    // usdcBalance 10_000_000n with 6 decimals = "10"
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders SOL balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText(/0\.1000 SOL/)).toBeInTheDocument();
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

  it("shows isGasSufficient Low badge on SOL panel", () => {
    render(<FundStatus status={makeStatus({ isGasSufficient: false })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("toggles USDC top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
  });

  it("collapses USDC top-up panel on second click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
  });

  it("toggles SOL top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (SOL)")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Top Up")[1]);
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
  });

  it("toggles USDC withdraw panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[0]);
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
  });

  it("toggles SOL withdraw panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[1]);
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
    expect(screen.getByText(/Rent-exempt minimum/)).toBeInTheDocument();
  });

  it("opening one panel closes another", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Top Up")[1]);
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
  });

  it("shows warning when usdcTokenAccount is null in top-up panel", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByText(/No USDC token account found/)).toBeInTheDocument();
  });

  it("shows warning when usdcTokenAccount is null in withdraw panel", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[0]);
    expect(screen.getByText(/No USDC token account found/)).toBeInTheDocument();
  });

  it("shows Create Account button when usdcTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    expect(screen.getByText("Create USDC Account")).toBeInTheDocument();
  });

  it("disables USDC Send button when usdcTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdcTokenAccount: null })} schedule={makeSchedule("USDC")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });
});

describe("FundStatus — USDT schedule", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders only USDT token panel (not USDC) for a USDT schedule", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    expect(screen.getByText("USDT Balance")).toBeInTheDocument();
    expect(screen.queryByText("USDC Balance")).not.toBeInTheDocument();
    expect(screen.getByText("SOL Balance")).toBeInTheDocument();
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
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("toggles USDT withdraw panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[0]);
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("shows warning when usdtTokenAccount is null in top-up panel", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Top Up")[0]);
    expect(screen.getByText(/No USDT token account found/)).toBeInTheDocument();
  });

  it("shows warning when usdtTokenAccount is null in withdraw panel", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[0]);
    expect(screen.getByText(/No USDT token account found/)).toBeInTheDocument();
  });

  it("disables USDT Withdraw button when usdtTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ usdtTokenAccount: null })} schedule={makeSchedule("USDT")} onRefresh={onRefresh} />);
    fireEvent.click(screen.getAllByText("Withdraw")[0]);
    const disabledBtn = screen
      .getAllByRole("button", { name: "Withdraw" })
      .find((b) => (b as HTMLButtonElement).disabled);
    expect(disabledBtn).toBeDefined();
  });
});
