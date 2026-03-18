import "../test/walletMock";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("hides Set Admin List panel when wallet is not upgrade authority", () => {
    mockUseIsUpgradeAuthority.mockReturnValue(false);
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.queryByText("Set Admin List")).not.toBeInTheDocument();
  });

  it("shows Set Admin List panel when wallet is upgrade authority", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Set Admin List")).toBeInTheDocument();
  });

  it("hides Register Payment Authority panel when wallet is not an admin", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    // currentAdmins is empty by default, so wallet is not in admin list
    expect(screen.queryByText("Register Payment Authority")).not.toBeInTheDocument();
  });

  it("shows connect wallet message when no wallet connected", () => {
    const origKey = mockWallet.publicKey;
    mockWallet.publicKey = null as any;

    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Connect your wallet")).toBeInTheDocument();

    mockWallet.publicKey = origKey;
  });
});
