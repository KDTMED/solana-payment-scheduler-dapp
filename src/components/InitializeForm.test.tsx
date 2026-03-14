import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitializeForm } from "./InitializeForm";

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

  it("clears inline error for valid public key", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: "not-a-pubkey" },
    });
    expect(screen.getByText("Invalid public key format.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    expect(screen.queryByText("Invalid public key format.")).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
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
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Recipient cannot be your own wallet.")).toBeInTheDocument();
    });
  });

  it("can switch token type to USDT", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    const usdt = screen.getByDisplayValue("USDT") as HTMLInputElement;
    fireEvent.click(usdt);
    expect(usdt.checked).toBe(true);
    // Amount placeholder should reflect USDT
    expect(screen.getByPlaceholderText("Amount (USDT)")).toBeInTheDocument();
  });

  it("updates a payment entry date", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    const dateInputs = screen.getAllByDisplayValue("");
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === "datetime-local",
    )!;
    fireEvent.change(dateInput, { target: { value: "2030-01-01T12:00" } });
    expect((dateInput as HTMLInputElement).value).toBe("2030-01-01T12:00");
  });

  it("updates a payment entry amount", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    const amountInput = screen.getByPlaceholderText(/Amount/);
    fireEvent.change(amountInput, { target: { value: "100" } });
    expect((amountInput as HTMLInputElement).value).toBe("100");
  });

  it("shows entry count and max", () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    expect(screen.getByText("(1/50)")).toBeInTheDocument();
  });

  it("shows validation error for past date entry", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    // Set a past date and valid amount
    const dateInputs = screen.getAllByDisplayValue("");
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === "datetime-local",
    )!;
    fireEvent.change(dateInput, { target: { value: "2020-01-01T12:00" } });
    const amountInput = screen.getByPlaceholderText(/Amount/);
    fireEvent.change(amountInput, { target: { value: "10" } });

    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Scheduled date must be in the future/)).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid amount", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    const dateInputs = screen.getAllByDisplayValue("");
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === "datetime-local",
    )!;
    fireEvent.change(dateInput, { target: { value: "2030-01-01T12:00" } });
    const amountInput = screen.getByPlaceholderText(/Amount/);
    fireEvent.change(amountInput, { target: { value: "0" } });

    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Invalid or zero amount/)).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid recipient public key on submit", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: "not-valid" },
    });
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid recipient public key.")).toBeInTheDocument();
    });
  });

  it("submits form and shows validation errors clear on valid re-submit", async () => {
    // First submit with empty entries to trigger validation
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Invalid recipient public key/)).toBeInTheDocument();
    });

    // Fix the recipient
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    // Submit again - should still show entry errors
    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Add at least one payment entry/)).toBeInTheDocument();
    });
    // Recipient error should be gone
    expect(screen.queryByText(/Invalid recipient public key/)).not.toBeInTheDocument();
  });

  it("shows multiple validation errors at once", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    // Set invalid recipient and a past date with zero amount
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: "bad" },
    });
    const dateInputs = screen.getAllByDisplayValue("");
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === "datetime-local",
    )!;
    fireEvent.change(dateInput, { target: { value: "2020-01-01T12:00" } });
    const amountInput = screen.getByPlaceholderText(/Amount/);
    fireEvent.change(amountInput, { target: { value: "0" } });

    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid recipient public key.")).toBeInTheDocument();
      expect(screen.getByText(/Scheduled date must be in the future/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid or zero amount/)).toBeInTheDocument();
    });
  });

  it("does not show no-entry error when entries have date and amount", async () => {
    render(<InitializeForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Pubkey…"), {
      target: { value: VALID_RECIPIENT },
    });
    const dateInputs = screen.getAllByDisplayValue("");
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === "datetime-local",
    )!;
    fireEvent.change(dateInput, { target: { value: "2030-06-15T10:00" } });
    const amountInput = screen.getByPlaceholderText(/Amount/);
    fireEvent.change(amountInput, { target: { value: "5.5" } });

    fireEvent.submit(screen.getByText("Create Schedule").closest("form")!);
    // Should not show "Add at least one" since we have a valid entry
    await waitFor(() => {
      expect(screen.queryByText(/Add at least one payment entry/)).not.toBeInTheDocument();
    });
  });
});
