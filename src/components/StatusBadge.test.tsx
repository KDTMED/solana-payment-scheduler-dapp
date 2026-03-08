import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders default 'OK' label when ok=true", () => {
    render(<StatusBadge ok={true} />);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("renders default 'Low' label when ok=false", () => {
    render(<StatusBadge ok={false} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<StatusBadge ok={true} label="Funded" />);
    expect(screen.getByText("Funded")).toBeInTheDocument();
  });

  it("applies green styles when ok=true", () => {
    const { container } = render(<StatusBadge ok={true} />);
    expect(container.firstChild).toHaveClass("text-emerald-400");
  });

  it("applies red styles when ok=false", () => {
    const { container } = render(<StatusBadge ok={false} />);
    expect(container.firstChild).toHaveClass("text-red-400");
  });
});
