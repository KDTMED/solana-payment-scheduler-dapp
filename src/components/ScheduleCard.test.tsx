import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { ScheduleCard } from "./ScheduleCard";
import { PaymentSchedule } from "../types";

vi.mock("@solana/spl-token", () => ({
  getAssociatedTokenAddress: vi.fn(() => Promise.resolve(new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ"))),
}));

const mockRpc = vi.fn().mockResolvedValue("mock-sig");
vi.mock("@coral-xyz/anchor", () => ({
  AnchorProvider: class MockProvider { constructor(..._args: any[]) {} },
  Program: class MockProgram {
    constructor(..._args: any[]) {}
    methods = {
      close: () => ({
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

function makeSchedule(overrides?: Partial<PaymentSchedule>): PaymentSchedule {
  return {
    publicKey: SCHEDULE_PK,
    authority: AUTHORITY_PK,
    scheduleId: 0n,
    recipient: RECIPIENT_PK,
    tokenType: "USDC",
    schedule: [
      { timestamp: Date.now() / 1000 + 3600, amount: 5_000_000n },
      { timestamp: Date.now() / 1000 + 7200, amount: 3_000_000n },
    ],
    executedCount: 0,
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

  it("shows the recipient address (truncated)", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    const truncated = RECIPIENT_PK.toBase58().slice(0, 20);
    expect(screen.getByText(new RegExp(truncated))).toBeInTheDocument();
  });

  it("shows the schedule ID", () => {
    render(<ScheduleCard schedule={makeSchedule({ scheduleId: 42n })} onClose={onClose} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows USDT token type when schedule is USDT", () => {
    render(<ScheduleCard schedule={makeSchedule({ tokenType: "USDT" })} onClose={onClose} />);
    expect(screen.getByText("USDT")).toBeInTheDocument();
    expect(screen.getByText(/Total USDT remaining/)).toBeInTheDocument();
  });

  it("shows correct total for single payment", () => {
    render(<ScheduleCard schedule={makeSchedule({
      schedule: [{ timestamp: Date.now() / 1000 + 3600, amount: 12_500_000n }],
    })} onClose={onClose} />);
    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // 1 pending
  });

  it("disables Confirm and Cancel buttons when busy state would be true", () => {
    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    // Before clicking Confirm, buttons should be enabled
    expect(screen.getByText("Confirm").closest("button")).not.toBeDisabled();
    expect(screen.getByText("Cancel").closest("button")).not.toBeDisabled();
  });

  it("calls onClose after successful close", async () => {
    mockRpc.mockResolvedValue("mock-sig");

    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows alert on close failure", async () => {
    mockRpc.mockRejectedValue(new Error("Close failed"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Close failed");
    });
    alertSpy.mockRestore();
  });

  it("shows Closing… text while busy", async () => {
    mockRpc.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ScheduleCard schedule={makeSchedule()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close Schedule"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(screen.getByText("Closing…")).toBeInTheDocument();
    });
  });
});
