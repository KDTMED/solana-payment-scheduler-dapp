import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Admin } from "./Admin";
import { mockWallet } from "../test/walletMock";
import * as useIsUpgradeAuthorityModule from "../hooks/useIsUpgradeAuthority";

vi.spyOn(useIsUpgradeAuthorityModule, "useIsUpgradeAuthority");

const mockUseIsUpgradeAuthority = useIsUpgradeAuthorityModule.useIsUpgradeAuthority as ReturnType<typeof vi.fn>;

describe("Admin", () => {
  beforeEach(() => {
    mockUseIsUpgradeAuthority.mockReturnValue(true);
  });

  it("shows Edit button when wallet is upgrade authority", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("hides Edit button when wallet is not upgrade authority", () => {
    mockUseIsUpgradeAuthority.mockReturnValue(false);
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("enters edit mode with admin form when Edit is clicked", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Set Admins")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Admin public key…")).toBeInTheDocument();
  });

  it("exits edit mode when Cancel is clicked", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Set Admins")).not.toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("can add and remove admin fields in edit mode", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    fireEvent.click(screen.getByText("Edit"));
    // Starts with one empty field
    expect(screen.getAllByPlaceholderText("Admin public key…")).toHaveLength(1);
    // Add another
    fireEvent.click(screen.getByText("+ Add admin"));
    expect(screen.getAllByPlaceholderText("Admin public key…")).toHaveLength(2);
    // Remove one
    const removeButtons = screen.getAllByText("×");
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText("Admin public key…")).toHaveLength(1);
  });

  it("always shows Registered Authorities panel", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Registered Authorities")).toBeInTheDocument();
    expect(screen.getByText("No authorities registered.")).toBeInTheDocument();
  });

  it("hides Add button for authorities when wallet is not an admin", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
  });

  it("shows connect wallet message when no wallet connected", () => {
    const origKey = mockWallet.publicKey;
    mockWallet.publicKey = null as any;

    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Connect your wallet")).toBeInTheDocument();

    mockWallet.publicKey = origKey;
  });
});
