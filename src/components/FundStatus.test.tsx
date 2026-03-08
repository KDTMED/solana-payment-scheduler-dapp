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

function makeStatus(overrides?: Partial<FundStatusType>): FundStatusType {
  return {
    tokenBalance: 10_000_000n,
    solBalance: 100_000_000,
    requiredForNext: 5_000_000n,
    isSufficient: true,
    isGasSufficient: true,
    sourceTokenAccount: TOKEN_ACCT_PK,
    ...overrides,
  };
}

function makeSchedule(): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: AUTHORITY_PK,
    recipient: RECIPIENT_PK,
    destinationTokenAccount: RECIPIENT_PK,
    tokenType: "USDC",
    schedule: [],
    bump: 255,
  };
}

const onRefresh = vi.fn();

describe("FundStatus — null state", () => {
  it("shows 'No schedule found' when status is null", () => {
    render(<FundStatus status={null} schedule={null} onRefresh={onRefresh} />);
    expect(screen.getByText("No schedule found.")).toBeInTheDocument();
  });
});

describe("FundStatus — with data", () => {
  beforeEach(() => { onRefresh.mockReset(); });

  it("renders token balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule()} onRefresh={onRefresh} />);
    // tokenBalance 10_000_000n with 6 decimals = "10"
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders SOL balance", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule()} onRefresh={onRefresh} />);
    // formatSol(100_000_000) = "0.1000"
    expect(screen.getByText(/0\.1000 SOL/)).toBeInTheDocument();
  });

  it("shows OK badge when isSufficient=true", () => {
    render(<FundStatus status={makeStatus({ isSufficient: true })} schedule={makeSchedule()} onRefresh={onRefresh} />);
    const badges = screen.getAllByText("OK");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows Low badge when isSufficient=false", () => {
    render(<FundStatus status={makeStatus({ isSufficient: false })} schedule={makeSchedule()} onRefresh={onRefresh} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("shows required amount for next payment", () => {
    render(<FundStatus status={makeStatus({ requiredForNext: 2_500_000n })} schedule={makeSchedule()} onRefresh={onRefresh} />);
    // formatTokenAmount(2_500_000n) = "2.5"
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });

  it("toggles token top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule()} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (USDC)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Top Up Tokens"));
    expect(screen.getByPlaceholderText("Amount (USDC)")).toBeInTheDocument();
  });

  it("toggles SOL top-up panel on button click", () => {
    render(<FundStatus status={makeStatus()} schedule={makeSchedule()} onRefresh={onRefresh} />);
    expect(screen.queryByPlaceholderText("Amount (SOL)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Top Up SOL"));
    expect(screen.getByPlaceholderText("Amount (SOL)")).toBeInTheDocument();
  });

  it("shows warning when sourceTokenAccount is null", () => {
    render(<FundStatus status={makeStatus({ sourceTokenAccount: null })} schedule={makeSchedule()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText("Top Up Tokens"));
    expect(screen.getByText(/No source token account found/)).toBeInTheDocument();
  });
});
