import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { ScheduleList } from "./ScheduleList";
import { PaymentSchedule } from "../types";

function makeSchedule(overrides?: Partial<PaymentSchedule>): PaymentSchedule {
  return {
    publicKey: new PublicKey("11111111111111111111111111111111"),
    authority: new PublicKey("So11111111111111111111111111111111111111112"),
    scheduleId: 0n,
    recipient: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    tokenType: "USDC",
    schedule: [
      { timestamp: 1700000000, amount: 5_000_000n },
      { timestamp: 1700100000, amount: 10_000_000n },
    ],
    executedCount: 0,
    bump: 255,
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ScheduleList", () => {
  it("shows empty state when no schedules", () => {
    renderWithRouter(<ScheduleList schedules={[]} />);
    expect(screen.getByText(/No schedules found/)).toBeInTheDocument();
  });

  it("renders schedule entries with id and recipient", () => {
    const s = makeSchedule({ scheduleId: 3n });
    renderWithRouter(<ScheduleList schedules={[s]} />);
    expect(screen.getByText("Schedule #3")).toBeInTheDocument();
    expect(screen.getByText(s.recipient.toBase58())).toBeInTheDocument();
  });

  it("shows total remaining token amount", () => {
    const s = makeSchedule(); // 5 + 10 = 15_000_000n = "15"
    renderWithRouter(<ScheduleList schedules={[s]} />);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("USDC remaining")).toBeInTheDocument();
  });

  it("shows pending count", () => {
    const s = makeSchedule(); // 2 pending entries
    renderWithRouter(<ScheduleList schedules={[s]} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders links to schedule detail pages", () => {
    const s = makeSchedule({ scheduleId: 7n });
    renderWithRouter(<ScheduleList schedules={[s]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/schedule/7");
  });

  it("renders multiple schedules", () => {
    const s1 = makeSchedule({ scheduleId: 1n, publicKey: new PublicKey("11111111111111111111111111111111") });
    const s2 = makeSchedule({ scheduleId: 2n, tokenType: "USDT", publicKey: new PublicKey("So11111111111111111111111111111111111111112") });
    renderWithRouter(<ScheduleList schedules={[s1, s2]} />);
    expect(screen.getByText("Schedule #1")).toBeInTheDocument();
    expect(screen.getByText("Schedule #2")).toBeInTheDocument();
    expect(screen.getByText("USDT remaining")).toBeInTheDocument();
  });

  it("shows heading when schedules exist", () => {
    renderWithRouter(<ScheduleList schedules={[makeSchedule()]} />);
    expect(screen.getByText("Your Schedules")).toBeInTheDocument();
  });
});
