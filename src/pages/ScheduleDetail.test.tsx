import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { MemoryRouter } from "react-router-dom";
import { ScheduleDetail } from "./ScheduleDetail";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "0" }),
  };
});

const SCHEDULE_PK = new PublicKey("11111111111111111111111111111111");

vi.mock("../utils/pda", () => ({
  findPaymentSchedulePda: () => [SCHEDULE_PK, 255],
}));

const mockRefreshFunds = vi.fn();
vi.mock("../hooks/useFundStatus", () => ({
  useFundStatus: () => ({ status: null, refresh: mockRefreshFunds }),
}));

const mockRefreshRecords = vi.fn();
vi.mock("../hooks/usePaymentRecords", () => ({
  usePaymentRecords: () => ({ records: [], loading: false, refresh: mockRefreshRecords }),
}));

const { mockConnection } = await import("../test/walletMock");

const mockDecode = vi.fn();
vi.mock("@coral-xyz/anchor", () => ({
  BorshAccountsCoder: class {
    decode(...args: any[]) { return mockDecode(...args); }
  },
  AnchorProvider: vi.fn(),
  Program: vi.fn(),
}));

// Mock ScheduleCard to capture the onClose prop
let capturedOnClose: (() => void) | undefined;
vi.mock("../components/ScheduleCard", () => ({
  ScheduleCard: ({ onClose }: { onClose: () => void }) => {
    capturedOnClose = onClose;
    return <div data-testid="schedule-card"><button onClick={onClose}>Close Schedule</button></div>;
  },
}));

vi.mock("../components/FundStatus", () => ({
  FundStatus: () => <div data-testid="fund-status" />,
}));

vi.mock("../components/PaymentsTable", () => ({
  PaymentsTable: () => <div data-testid="payments-table" />,
}));

describe("ScheduleDetail", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRefreshFunds.mockReset();
    mockRefreshRecords.mockReset();
    capturedOnClose = undefined;
    (mockConnection as any).getAccountInfo = vi.fn();
    (mockConnection as any).onAccountChange.mockReset().mockReturnValue(42);
    (mockConnection as any).removeAccountChangeListener.mockReset();
  });

  it("navigates to / when schedule is closed", async () => {
    const AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
    const RECIPIENT = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    (mockConnection as any).getAccountInfo.mockResolvedValue({
      data: Buffer.from([]),
      executable: false,
      lamports: 1000000,
      owner: new PublicKey("11111111111111111111111111111111"),
    });

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDC: {} },
      schedule: [
        { timestamp: { toNumber: () => Date.now() / 1000 + 3600 }, amount: BigInt(5_000_000) },
      ],
      executed_count: 0,
      bump: 255,
    });

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    // Call the onClose prop that ScheduleCard received
    expect(capturedOnClose).toBeDefined();
    capturedOnClose!();

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows not-found message with back link when schedule is null", async () => {
    (mockConnection as any).getAccountInfo.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Schedule not found/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Back to schedules/)).toBeInTheDocument();
  });

  it("shows error message when fetching fails", async () => {
    (mockConnection as any).getAccountInfo.mockRejectedValue(new Error("RPC down"));

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load schedule. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows loading spinner initially", () => {
    (mockConnection as any).getAccountInfo.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Loading schedule/)).toBeInTheDocument();
  });

  it("shows all child components and refresh button when schedule loads", async () => {
    const AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
    const RECIPIENT = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    (mockConnection as any).getAccountInfo.mockResolvedValue({
      data: Buffer.from([]),
      executable: false,
      lamports: 1000000,
      owner: new PublicKey("11111111111111111111111111111111"),
    });

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDT: {} },
      schedule: [],
      executed_count: 0,
      bump: 255,
    });

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("fund-status")).toBeInTheDocument();
    expect(screen.getByTestId("payments-table")).toBeInTheDocument();
    expect(screen.getByText("↻")).toBeInTheDocument();
    expect(screen.getAllByText(/Back to schedules/).length).toBeGreaterThan(0);
  });
  it("subscribes to on-chain account changes after mount", async () => {
    const AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
    const RECIPIENT = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    (mockConnection as any).getAccountInfo.mockResolvedValue({
      data: Buffer.from([]),
      executable: false,
      lamports: 1000000,
      owner: new PublicKey("11111111111111111111111111111111"),
    });

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDC: {} },
      schedule: [],
      executed_count: 0,
      bump: 255,
    });

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    expect(mockConnection.onAccountChange).toHaveBeenCalledWith(
      SCHEDULE_PK,
      expect.any(Function),
    );
  });

  it("unsubscribes from account changes on unmount", async () => {
    const AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
    const RECIPIENT = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    (mockConnection as any).getAccountInfo.mockResolvedValue({
      data: Buffer.from([]),
      executable: false,
      lamports: 1000000,
      owner: new PublicKey("11111111111111111111111111111111"),
    });

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDC: {} },
      schedule: [],
      executed_count: 0,
      bump: 255,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    unmount();

    expect(mockConnection.removeAccountChangeListener).toHaveBeenCalledWith(42);
  });

  it("updates schedule and refreshes funds/records when account changes", async () => {
    const AUTHORITY = new PublicKey("So11111111111111111111111111111111111111112");
    const RECIPIENT = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    (mockConnection as any).getAccountInfo.mockResolvedValue({
      data: Buffer.from([]),
      executable: false,
      lamports: 1000000,
      owner: new PublicKey("11111111111111111111111111111111"),
    });

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDC: {} },
      schedule: [
        { timestamp: Date.now() / 1000 + 3600, amount: BigInt(5_000_000) },
      ],
      executed_count: 0,
      bump: 255,
    });

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("schedule-card")).toBeInTheDocument();
    });

    // Simulate on-chain account change callback
    const callback = mockConnection.onAccountChange.mock.calls[0][1];
    mockRefreshFunds.mockReset();
    mockRefreshRecords.mockReset();

    mockDecode.mockReturnValue({
      authority: AUTHORITY,
      schedule_id: { toString: () => "0" },
      recipient: RECIPIENT,
      token_type: { USDC: {} },
      schedule: [
        { timestamp: Date.now() / 1000 + 3600, amount: BigInt(5_000_000) },
      ],
      executed_count: 1,
      bump: 255,
    });

    callback({ data: Buffer.from([]), executable: false, lamports: 1000000, owner: new PublicKey("11111111111111111111111111111111") });

    expect(mockRefreshFunds).toHaveBeenCalled();
    expect(mockRefreshRecords).toHaveBeenCalled();
  });
});

describe("ScheduleDetail — no wallet", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (mockConnection as any).getAccountInfo = vi.fn();
  });

  it("shows connect wallet message when wallet not connected", async () => {
    // Temporarily override useWallet to return null publicKey
    const walletMock = await import("../test/walletMock");
    const original = walletMock.mockWallet.publicKey;
    (walletMock.mockWallet as any).publicKey = null;

    render(
      <MemoryRouter initialEntries={["/schedule/0"]}>
        <ScheduleDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Connect your wallet/)).toBeInTheDocument();
    });

    // Restore
    (walletMock.mockWallet as any).publicKey = original;
  });
});
