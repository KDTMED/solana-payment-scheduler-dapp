import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitializeForm } from "./InitializeForm";

// Mock getAssociatedTokenAddress so ATA derivation doesn't need real crypto
vi.mock("@solana/spl-token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/spl-token")>();
  return {
    ...actual,
    getAssociatedTokenAddress: vi.fn().mockResolvedValue({
      toBase58: () => "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ",
    }),
  };
});

const VALID_RECIPIENT = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const onSuccess = vi.fn();

describe("InitializeForm", () => {
  beforeEach(() => { onSuccess.mockReset(); });

  it("renders the form", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    expect(screen.getByText("Initialize Schedule")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Pubkey…")).toBeInTheDocument();
    expect(screen.getByText("Create Schedule")).toBeInTheDocument();
  });

  it("shows inline error for invalid public key", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: "not-a-pubkey" },
    });
    expect(screen.getByText("Invalid public key format.")).toBeInTheDocument();
  });

  it("clears inline error for valid public key", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: "not-a-pubkey" },
    });
    expect(screen.getByText("Invalid public key format.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    expect(screen.queryByText("Invalid public key format.")).not.toBeInTheDocument();
    // Wait for the async ATA derivation effect to settle
    await waitFor(() => {
      expect(screen.getByText(/Destination ATA:/)).toBeInTheDocument();
    });
  });

  it("shows USDC and USDT token type options", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    expect(screen.getByDisplayValue("USDC")).toBeInTheDocument();
    expect(screen.getByDisplayValue("USDT")).toBeInTheDocument();
  });

  it("defaults to USDC selected", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    const usdc = screen.getByDisplayValue("USDC") as HTMLInputElement;
    expect(usdc.checked).toBe(true);
  });

  it("adds a payment entry when '+ Add entry' is clicked", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    const rows = screen.getAllByPlaceholderText(/Amount/);
    expect(rows).toHaveLength(1);
    fireEvent.click(screen.getByText("+ Add entry"));
    expect(screen.getAllByPlaceholderText(/Amount/)).toHaveLength(2);
  });

  it("removes a payment entry when × is clicked", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText("+ Add entry")); // now 2 entries
    const removeButtons = screen.getAllByText("×");
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText(/Amount/)).toHaveLength(1);
  });

  it("shows 'Add at least one payment entry' error when entries are empty", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    // Set a valid recipient so destAta is derived and the handler proceeds to validate()
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    await waitFor(() => {
      expect(screen.getByText(/Destination ATA:/)).toBeInTheDocument();
    });
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Add at least one payment entry.")).toBeInTheDocument();
    });
  });

  it("shows error when recipient is invalid (same wallet)", async () => {
    // mockPublicKey = 11111...1 (system program), use it as recipient to trigger "cannot be your own wallet"
    const { mockPublicKey } = await import("../test/walletMock");
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: mockPublicKey.toBase58() },
    });
    await waitFor(() => {
      expect(screen.getByText(/Destination ATA:/)).toBeInTheDocument();
    });
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Recipient cannot be your own wallet.")).toBeInTheDocument();
    });
  });

  it("shows 'Destination ATA' preview when recipient is valid", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    await waitFor(() => {
      expect(screen.getByText(/Destination ATA:/)).toBeInTheDocument();
    });
  });
});
