import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

/**
 * React logs every caught render error to console.error. That is expected
 * here, so it is silenced to keep the output readable — but only for these
 * tests, and restored afterwards.
 */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

/** Reproduces the exact DashboardPage crash. */
function Exploding({ stats }: { stats: { totalUsers?: number } }) {
  // Verbatim what DashboardPage did, four times, on an untyped response with
  // no optional chaining.
  return <div>{stats.totalUsers!.toLocaleString()}</div>;
}

describe("ADM-004 — the blank white page after login", () => {
  it("demonstrates the crash the boundary now contains", () => {
    // Without a boundary React 19 unmounts the WHOLE tree, so the admin got a
    // completely blank document — no message, no navigation, reproducible on
    // reload because the same response came back.
    expect(() => render(<Exploding stats={{}} />)).toThrow(TypeError);
  });

  it("renders a message and recovery actions instead of nothing", () => {
    render(
      <ErrorBoundary label="dashboard">
        <Exploding stats={{}} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/dashboard could not be displayed/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reload page" }),
    ).toBeInTheDocument();
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Exploding stats={{ totalUsers: 1234 }} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("recovers when the underlying problem is gone", async () => {
    function Harness() {
      const [broken, setBroken] = useState(true);
      return (
        <>
          <button onClick={() => setBroken(false)}>Fix data</button>
          <ErrorBoundary>
            <Exploding stats={broken ? {} : { totalUsers: 7 }} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Repair the data, then reset the boundary — the sequence a user follows
    // when the failure was transient.
    await userEvent.click(screen.getByRole("button", { name: "Fix data" }));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("isolates a failure to the subtree it wraps", () => {
    // This is why there are two boundaries: one above the router, one inside
    // Layout. A page crashing must leave the sidebar navigable.
    render(
      <div>
        <nav>Sidebar</nav>
        <ErrorBoundary label="user list">
          <Exploding stats={{}} />
        </ErrorBoundary>
      </div>,
    );

    expect(screen.getByText("Sidebar")).toBeInTheDocument();
    expect(
      screen.getByText(/user list could not be displayed/),
    ).toBeInTheDocument();
  });

  it("surfaces the underlying message for diagnosis", () => {
    render(
      <ErrorBoundary>
        <Exploding stats={{}} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/Cannot read properties of undefined/),
    ).toBeInTheDocument();
  });
});
