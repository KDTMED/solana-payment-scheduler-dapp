import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { PaymentsTable } from "./PaymentsTable";
import { PaymentSchedule, PaymentRecord } from "../types";

// Fix system time so isOverdue / durationFromNow are deterministic
const NOW_UNIX = 1_700_000_000; // arbitrary fixed point in the past
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_UNIX * 1000);
});

const SCHEDULE_PK = new PublicKey("11111111111111111111111111111111");
const AUTHORITY_PK = new PublicKey("So11111111111111111111111111111111111111112");
const RECIPIENT_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RECORD_PK = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ");

function makeSchedule(overrides?: Partial<PaymentSchedule>): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: AUTHORITY_PK,
    scheduleId: 0n,
    recipient: RECIPIENT_PK,
    tokenType: "USDC",
    bump: 255,
    executedCount: 0,
    schedule: [],
    ...overrides,
  };
}

function makeRecord(overrides?: Partial<PaymentRecord>): PaymentRecord {
  return {
    publicKey: RECORD_PK,
    timestamp: NOW_UNIX - 3600,
    amount: 5_000_000n,
    recipient: RECIPIENT_PK,
    executedAt: NOW_UNIX - 100,
    paymentIndex: 0,
    bump: 255,
    ...overrides,
  };
}

describe("PaymentsTable — empty state", () => {
  it("shows empty scheduled payments message when schedule is null", () => {
    render(<PaymentsTable schedule={null} records={[]} tokenType="USDC" />);
    expect(screen.getByText("No payments scheduled.")).toBeInTheDocument();
  });

  it("shows empty scheduled payments message when schedule has no entries", () => {
    render(<PaymentsTable schedule={makeSchedule()} records={[]} tokenType="USDC" />);
    expect(screen.getByText("No payments scheduled.")).toBeInTheDocument();
  });

  it("shows empty history message when records is empty", () => {
    render(<PaymentsTable schedule={null} records={[]} tokenType="USDC" />);
    expect(screen.getByText("No payments executed yet.")).toBeInTheDocument();
  });
});

describe("PaymentsTable — scheduled payments", () => {
  it("renders a row for each scheduled payment", () => {
    const schedule = makeSchedule({
      schedule: [
        { timestamp: NOW_UNIX + 3600, amount: 1_000_000n },
        { timestamp: NOW_UNIX + 7200, amount: 2_000_000n },
      ],
    });
    render(<PaymentsTable schedule={schedule} records={[]} tokenType="USDC" />);
    expect(screen.getByText("2 pending")).toBeInTheDocument();
    // Two rows: row index cells contain "1" and "2"
    const rows = screen.getAllByRole("row");
    // 1 header row + 2 data rows = 3
    expect(rows).toHaveLength(3);
  });

  it("shows the token type label next to amounts", () => {
    const schedule = makeSchedule({
      schedule: [{ timestamp: NOW_UNIX + 3600, amount: 1_000_000n }],
    });
    render(<PaymentsTable schedule={schedule} records={[]} tokenType="USDT" />);
    // formatTokenAmount(1_000_000n) = "1"; tokenType = "USDT"
    expect(screen.getAllByText("USDT").length).toBeGreaterThan(0);
  });

  it("marks overdue payments with 'Due' badge", () => {
    const schedule = makeSchedule({
      schedule: [{ timestamp: NOW_UNIX - 1, amount: 1_000_000n }],
    });
    render(<PaymentsTable schedule={schedule} records={[]} tokenType="USDC" />);
    expect(screen.getByText("Due")).toBeInTheDocument();
  });

  it("marks future payments with 'Pending' badge", () => {
    const schedule = makeSchedule({
      schedule: [{ timestamp: NOW_UNIX + 3600, amount: 1_000_000n }],
    });
    render(<PaymentsTable schedule={schedule} records={[]} tokenType="USDC" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});

describe("PaymentsTable — payment history", () => {
  it("renders a row for each completed record", () => {
    const records = [makeRecord(), makeRecord({ publicKey: SCHEDULE_PK, paymentIndex: 1 })];
    render(<PaymentsTable schedule={null} records={records} tokenType="USDC" />);
    expect(screen.getByText("2 completed")).toBeInTheDocument();
  });

  it("shows 'Executed' badge for each record", () => {
    render(<PaymentsTable schedule={null} records={[makeRecord()]} tokenType="USDC" />);
    expect(screen.getByText("Executed")).toBeInTheDocument();
  });

  it("displays the payment index", () => {
    render(<PaymentsTable schedule={null} records={[makeRecord({ paymentIndex: 3 })]} tokenType="USDC" />);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });
});
