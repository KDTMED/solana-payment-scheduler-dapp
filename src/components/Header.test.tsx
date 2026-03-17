import "../test/walletMock";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the app title", () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText("Scheduled Transfer")).toBeInTheDocument();
  });

  it("renders the ST logo abbreviation", () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText("ST")).toBeInTheDocument();
  });

  it("renders the wallet connect button", () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });
});
