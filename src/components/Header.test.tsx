import "../test/walletMock";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the app title", () => {
    render(<Header />);
    expect(screen.getByText("Scheduled Transfer")).toBeInTheDocument();
  });

  it("renders the ST logo abbreviation", () => {
    render(<Header />);
    expect(screen.getByText("ST")).toBeInTheDocument();
  });

  it("renders the wallet connect button", () => {
    render(<Header />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });
});
