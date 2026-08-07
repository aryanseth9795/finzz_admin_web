import { describe, it, expect } from "vitest";
import {
  describeTableScope,
  describeFilterTotal,
  pageTotal,
  describePeriod,
  formatAmount,
} from "./expenseReport";

const meta = (page: number, pages: number, total: number, limit = 50) => ({
  page,
  pages,
  total,
  limit,
});

/**
 * ADM-003 — the Critical finding in the admin panel.
 *
 * The exported PDF claimed "Period: All Time" and printed a total computed
 * from a single 50-row page.
 */
describe("ADM-003 — the PDF that misstated financial totals", () => {
  it("reproduces the original defect, for contrast", () => {
    // 523 expenses matching the filter; the client holds 50 of them.
    const heldByClient = Array.from({ length: 50 }, () => ({ amount: 100 }));
    const oldTotal = heldByClient.reduce((s, e) => s + (e.amount || 0), 0);

    // The document said "Period: All Time / Total Amount: 5000.00" while the
    // true filter total was 52,300 — a tenth of the real figure.
    expect(oldTotal).toBe(5000);
    expect(oldTotal).not.toBe(52300);
  });

  it("states the exact row range when the table is a slice", () => {
    expect(describeTableScope(1, 50, meta(1, 11, 523))).toBe(
      "Table below shows rows 1-50 of 523 (page 1 of 11).",
    );
  });

  it("gets the range right on a middle page", () => {
    expect(describeTableScope(3, 50, meta(3, 11, 523))).toBe(
      "Table below shows rows 101-150 of 523 (page 3 of 11).",
    );
  });

  it("gets the range right on a short final page", () => {
    // 523 = 10 full pages + 23. The last page must not claim rows 501-550.
    expect(describeTableScope(11, 23, meta(11, 11, 523))).toBe(
      "Table below shows rows 501-523 of 523 (page 11 of 11).",
    );
  });

  it("never claims a range extending past the total", () => {
    // The property that matters: the stated last row can never exceed the
    // stated total, on any page of any dataset.
    for (let page = 1; page <= 11; page++) {
      const rows = page === 11 ? 23 : 50;
      const text = describeTableScope(page, rows, meta(page, 11, 523));
      const match = /rows (\d+)-(\d+) of (\d+)/.exec(text);
      if (!match) continue;
      const [, first, last, total] = match.map(Number);
      expect(last, `page ${page}`).toBeLessThanOrEqual(total);
      expect(first, `page ${page}`).toBeLessThanOrEqual(last);
    }
  });

  it("says so plainly when the table IS the whole set", () => {
    expect(describeTableScope(1, 12, meta(1, 1, 12))).toBe(
      "Table below shows all 12 matching transaction(s).",
    );
  });

  it("handles an empty result without inventing a range", () => {
    expect(describeTableScope(1, 0, meta(1, 0, 0))).toBe(
      "No transactions match this filter.",
    );
  });

  it("degrades safely when pagination metadata is missing", () => {
    // `pagination` starts null; the old code did `pagination.total` on `{}`.
    expect(describeTableScope(1, 5, null)).toBe(
      "Table below shows all 5 matching transaction(s).",
    );
  });
});

describe("The two totals are never conflated", () => {
  it("reports the server's aggregate as the filter total", () => {
    expect(describeFilterTotal({ totalAmount: 52300, count: 523 })).toBe(
      "Filter total: 52,300.00  across 523 transaction(s)",
    );
  });

  it("says 'unavailable' rather than falling back to the page sum", () => {
    // Falling back is exactly what produced the wrong number. An honest
    // absence is better than a confident wrong figure.
    const text = describeFilterTotal(null);
    expect(text).toBe("Filter total: unavailable");
    expect(text).not.toMatch(/\d/);
  });

  it("computes the page total from only the printed rows", () => {
    expect(pageTotal([{ amount: 100 }, { amount: 50.5 }])).toBe(150.5);
  });

  it("ignores null and NaN amounts instead of poisoning the sum", () => {
    // A null amount — which the mobile client's NaN hole used to write — made
    // the whole reduce NaN, and the PDF printed "NaN".
    expect(
      pageTotal([
        { amount: 100 },
        { amount: undefined },
        { amount: NaN },
        {} as { amount?: number },
      ]),
    ).toBe(100);
  });
});

describe("Period and amount formatting", () => {
  it("describes an open-ended range without pretending it is bounded", () => {
    expect(describePeriod("", "")).toBe("Period: All time");
    expect(describePeriod("2026-01-01", "")).toBe(
      "Period: 2026-01-01 to today",
    );
    expect(describePeriod("", "2026-03-31")).toBe(
      "Period: earliest to 2026-03-31",
    );
  });

  it("formats amounts in Indian grouping with two decimals", () => {
    // en-IN grouping: 12,34,567.00 — not the US 1,234,567.00 that an
    // unqualified toLocaleString produced on a US-locale machine.
    expect(formatAmount(1234567)).toBe("12,34,567.00");
    expect(formatAmount(0)).toBe("0.00");
    expect(formatAmount(NaN)).toBe("0.00");
  });
});
