import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { ScheduleCard } from "./ScheduleCard";
import { PaymentSchedule } from "../types";

const SCHEDULE_PK = new PublicKey("11111111111111111111111111111111");
const AUTHORITY_PK = new PublicKey("So11111111111111111111111111111111111111112");
const RECIPIENT_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function makeSchedule(overrides?: Partial<PaymentSchedule>): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: AUTHORITY_PK,
    recipient: RECIPIENT_PK,
    destinationTokenAccount: RECIPIENT_PK,
    tokenType: "USDC",
    schedule: [
      { timestamp: Date.now() / 1000 + 3600, amount: 5_000_000n },
      { timestamp: Date.now() / 1000 + 7200, amount: 3_000_000n },
    ],
    bump: 255,
    ...overrides,
  };
}

const onClose = vi.fn();

describe("ScheduleCard", () => {
  beforeEach(() => { onClose.mockReset(); });

  it("renders nothing when schedule is null", () => {
    const { container } = render(<ScheduleCard schedule={null} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the schedule public key", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    expect(screen.getByText(SCHEDULE_PK.toBase58())).toBeInTheDocument();
  });

  it("shows the number of pending payments", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows the total remaining amount", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    // 5_000_000n + 3_000_000n = 8_000_000n → formatTokenAmount = "8"
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows the token type", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    expect(screen.getByText("USDC")).toBeInTheDocument();
  });

  it("shows 'Close Schedule' button initially", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    expect(screen.getByText("Close Schedule")).toBeInTheDocument();
  });

  it("shows confirmation UI when 'Close Schedule' is clicked", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText(/Close this schedule/)).toBeInTheDocument();
  });

  it("returns to normal state when Cancel is clicked", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Close Schedule")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
  });
});
