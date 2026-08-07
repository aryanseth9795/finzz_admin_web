import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog";

const setup = (overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete this user permanently?"
      message="This cannot be undone."
      confirmLabel="Delete user"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
};

/**
 * ADM-015/ADM-016. The panel's original confirmation modal had no `role`, no
 * `aria-modal`, no focus trap, no focus restoration and no Escape handler —
 * so keyboard focus stayed on the page behind the overlay and a keyboard user
 * could tab into and activate the form underneath while it was "open".
 *
 * User deletion, meanwhile, was guarded by a bare `window.confirm()`.
 */
describe("ADM-015 — the dialog is now actually a dialog", () => {
  it("exposes dialog semantics to assistive technology", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // The title and body are programmatically associated, not merely adjacent.
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-title");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-message");
  });

  it("cancels on Escape", async () => {
    const { onCancel } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels on a backdrop click but not on a click inside", async () => {
    const { onCancel } = setup();

    await userEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("traps Tab inside the dialog", async () => {
    setup();
    const focusable = screen.getAllByRole("button");

    // Tab from the last focusable element must wrap to the first, not escape
    // to the page underneath.
    focusable[focusable.length - 1].focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(focusable[0]);

    // …and Shift+Tab from the first wraps to the last.
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it("restores focus to whatever opened it", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Delete";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <ConfirmDialog
        title="Confirm"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    unmount();
    // Without this the user loses their place in the table entirely.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });
});

describe("ADM-016 — friction proportional to consequence", () => {
  it("keeps confirm disabled until the exact name is typed", async () => {
    const { onConfirm } = setup({ requireTyped: "Alice Kumar" });

    const confirm = screen.getByRole("button", { name: "Delete user" });
    expect(confirm).toBeDisabled();

    const input = screen.getByLabelText(/Type/i);
    await userEvent.type(input, "Alice");
    expect(confirm).toBeDisabled();

    await userEvent.type(input, " Kumar");
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not accept a near-miss", async () => {
    const { onConfirm } = setup({ requireTyped: "Alice Kumar" });
    await userEvent.type(screen.getByLabelText(/Type/i), "alice kumar");

    // Case-sensitive on purpose: this gate exists to force deliberate reading.
    expect(screen.getByRole("button", { name: "Delete user" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms directly when no typed confirmation is required", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Delete user" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cannot be double-submitted while the action is in flight", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((r) => { resolve = r; }),
    );

    render(
      <ConfirmDialog
        title="Confirm"
        message="Sure?"
        confirmLabel="Go"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Go" });
    await userEvent.click(button);

    // The button reports progress and refuses further clicks.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Working…" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    resolve();
  });
});
