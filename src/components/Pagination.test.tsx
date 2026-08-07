import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./Pagination";
import { buildWindow } from "./paginationWindow";

const meta = (page: number, pages: number, total: number, limit = 15) => ({
  page,
  pages,
  total,
  limit,
});

/**
 * ADM-017. The original was:
 *
 *     Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1)
 *
 * — always pages 1..5 regardless of position.
 */
describe("ADM-017 — the pagination window never slid", () => {
  it("reproduces the old behaviour, for contrast", () => {
    const old = (pages: number) =>
      Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1);

    // On page 20 of 34, the old control offered pages 1-5 and highlighted none
    // of them — no way to reach page 20's neighbours, and no indication of
    // where you were.
    expect(old(34)).toEqual([1, 2, 3, 4, 5]);
    expect(old(34)).not.toContain(20);
  });

  it("centres the window on the current page", () => {
    expect(buildWindow(20, 34)).toEqual([18, 19, 20, 21, 22]);
    expect(buildWindow(20, 34)).toContain(20);
  });

  it("clamps at the start without shrinking", () => {
    expect(buildWindow(1, 34)).toEqual([1, 2, 3, 4, 5]);
    expect(buildWindow(2, 34)).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps at the end without running past the last page", () => {
    expect(buildWindow(34, 34)).toEqual([30, 31, 32, 33, 34]);
    expect(buildWindow(33, 34)).toEqual([30, 31, 32, 33, 34]);
  });

  it("shows every page when there are fewer than the window size", () => {
    expect(buildWindow(2, 3)).toEqual([1, 2, 3]);
    expect(buildWindow(1, 1)).toEqual([1]);
  });

  it("always includes the current page, for every page of a long range", () => {
    // The property that actually matters: you can always see where you are.
    for (let page = 1; page <= 34; page++) {
      expect(buildWindow(page, 34), `page ${page}`).toContain(page);
    }
  });

  it("never emits a page outside the valid range", () => {
    for (let page = 1; page <= 34; page++) {
      for (const p of buildWindow(page, 34)) {
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(34);
      }
    }
  });
});

describe("Pagination component", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination pagination={meta(1, 1, 8)} page={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when pagination is null", () => {
    // Was `pagination.pages > 1` on a `{}` initial state — the reason several
    // pages threw once the type stopped being `any`.
    const { container } = render(
      <Pagination pagination={null} page={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page with aria-current", () => {
    render(
      <Pagination pagination={meta(20, 34, 500)} page={20} onPageChange={vi.fn()} />,
    );
    // Screen readers announce position rather than relying on an `active`
    // CSS class, which is purely visual.
    expect(screen.getByRole("button", { name: "Page 20" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Page 19" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("lets the user jump to the first and last page", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        pagination={meta(20, 34, 500)}
        page={20}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPageChange).toHaveBeenCalledWith(34);

    await userEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(
      <Pagination pagination={meta(1, 34, 500)} page={1} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

    rerender(
      <Pagination pagination={meta(34, 34, 500)} page={34} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("states the row range so the page is not mistaken for the whole set", () => {
    render(
      <Pagination
        pagination={meta(3, 34, 500)}
        page={3}
        onPageChange={vi.fn()}
        rowCount={15}
      />,
    );
    expect(screen.getByText(/Showing 31–45 of 500/)).toBeInTheDocument();
  });
});
