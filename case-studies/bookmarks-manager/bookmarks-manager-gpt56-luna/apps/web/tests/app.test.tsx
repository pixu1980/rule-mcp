import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("bookmark manager shell", () => {
  it("exposes a labelled link capture form", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /save what matters/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/paste a link/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /preview link/i }),
    ).toBeInTheDocument();
  });
});
