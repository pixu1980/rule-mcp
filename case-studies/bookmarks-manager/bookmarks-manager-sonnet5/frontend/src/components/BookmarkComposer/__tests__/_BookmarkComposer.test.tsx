/**
 * @module components/BookmarkComposer/__tests__/_BookmarkComposer.test
 *
 * Validates client-side URL validation and submit wiring without touching
 * the network layer.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BookmarkComposer } from "../_BookmarkComposer";

describe("BookmarkComposer", () => {
  it("shows a validation message and does not submit for a non-URL value", () => {
    const onSubmit = vi.fn();
    render(
      <BookmarkComposer status="idle" errorMessage={null} onSubmit={onSubmit} onDismissError={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/paste a link/i), { target: { value: "not a url" } });
    fireEvent.click(screen.getByRole("button", { name: /save link/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a full link/i);
  });

  it("submits the trimmed URL when valid", () => {
    const onSubmit = vi.fn();
    render(
      <BookmarkComposer status="idle" errorMessage={null} onSubmit={onSubmit} onDismissError={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/paste a link/i), {
      target: { value: "  https://example.com/article  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save link/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://example.com/article");
  });

  it("disables the submit button while submitting", () => {
    render(
      <BookmarkComposer status="submitting" errorMessage={null} onSubmit={vi.fn()} onDismissError={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("renders the error toast and dismisses it", () => {
    const onDismissError = vi.fn();
    render(
      <BookmarkComposer
        status="error"
        errorMessage="Something went wrong."
        onSubmit={vi.fn()}
        onDismissError={onDismissError}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    fireEvent.click(screen.getByRole("button", { name: /dismiss message/i }));
    expect(onDismissError).toHaveBeenCalled();
  });
});
