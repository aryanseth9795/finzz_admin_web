import { describe, it, expect } from "vitest";
import {
  describeTableScope,
  describeFilterTotal,
  pageTotal,
  describePeriod,
  formatAmount,
  isCredit,
  formatExpenseDate,
  dailyDebitTotals,
  categoryDebitTotals,
  categoryPieData,
  pageCredits,
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
      "Filter total (debits + credits): 52,300.00  across 523 transaction(s)",
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

describe("Debits and credits are kept apart", () => {
  it("treats only an explicit 'credit' as a credit (legacy rows are debits)", () => {
    expect(isCredit({ type: "credit" })).toBe(true);
    expect(isCredit({ type: "debit" })).toBe(false);
    expect(isCredit({})).toBe(false);
  });

  it("page total counts debits only; page credits counts credits only", () => {
    const rows = [
      { amount: 100 },
      { amount: 40, type: "debit" as const },
      { amount: 500, type: "credit" as const },
      { amount: 25.5, type: "credit" as const },
    ];
    expect(pageTotal(rows)).toBe(140);
    expect(pageCredits(rows)).toBe(525.5);
  });

  it("page credits ignores null and NaN amounts", () => {
    expect(
      pageCredits([
        { amount: NaN, type: "credit" },
        { amount: undefined, type: "credit" },
        { amount: 10, type: "credit" },
      ]),
    ).toBe(10);
  });
});

describe("formatExpenseDate — UTC midnight dates", () => {
  it("formats in en-IN using the UTC calendar day", () => {
    // Stored at UTC midnight; a browser west of UTC would otherwise show the
    // previous day.
    expect(formatExpenseDate("2026-03-10T00:00:00.000Z")).toBe("10 Mar 2026");
    expect(formatExpenseDate("2026-03-03T23:59:59.000Z")).toBe("03 Mar 2026");
  });
});

describe("dailyDebitTotals — the daily bar chart", () => {
  it("sums debits per UTC day, ascending, and leaves credits out", () => {
    const rows = [
      { amount: 30, date: "2026-03-11T00:00:00.000Z" },
      { amount: 10, date: "2026-03-10T00:00:00.000Z", type: "debit" as const },
      { amount: 5, date: "2026-03-10T00:00:00.000Z" },
      { amount: 999, date: "2026-03-10T00:00:00.000Z", type: "credit" as const },
    ];
    expect(dailyDebitTotals(rows)).toEqual([
      { key: "2026-03-10", label: "10 Mar", total: 15 },
      { key: "2026-03-11", label: "11 Mar", total: 30 },
    ]);
  });

  it("does not merge the same day of different years, and labels the year", () => {
    // The old reducer keyed on "10 Mar", so 2025 and 2026 shared one bar.
    const rows = [
      { amount: 20, date: "2026-03-10T00:00:00.000Z" },
      { amount: 7, date: "2025-03-10T00:00:00.000Z" },
    ];
    expect(dailyDebitTotals(rows)).toEqual([
      { key: "2025-03-10", label: "10 Mar 2025", total: 7 },
      { key: "2026-03-10", label: "10 Mar 2026", total: 20 },
    ]);
  });

  it("returns nothing for a page of credits only", () => {
    expect(
      dailyDebitTotals([
        { amount: 50, date: "2026-03-10T00:00:00.000Z", type: "credit" },
      ]),
    ).toEqual([]);
  });

  it("skips rows with an unparseable date", () => {
    expect(
      dailyDebitTotals([
        { amount: 50, date: "not a date" },
        { amount: 5, date: "2026-03-10T00:00:00.000Z" },
      ]),
    ).toEqual([{ key: "2026-03-10", label: "10 Mar", total: 5 }]);
  });
});

describe("categoryDebitTotals — the per-page pie fallback", () => {
  it("sums debits by category, largest first, with a label for blanks", () => {
    const rows = [
      { amount: 10, category: "Food" },
      { amount: 40, category: "Travel" },
      { amount: 15, category: "Food" },
      { amount: 5 },
      { amount: 3, category: "" },
      { amount: 1000, category: "Salary", type: "credit" as const },
    ];
    expect(categoryDebitTotals(rows)).toEqual([
      { name: "Travel", value: 40 },
      { name: "Food", value: 25 },
      { name: "Uncategorised", value: 8 },
    ]);
  });

  it("is empty when the page has no debits", () => {
    expect(
      categoryDebitTotals([{ amount: 5, category: "Gift", type: "credit" }]),
    ).toEqual([]);
  });
});

describe("describeFilterTotal — with server credit totals", () => {
  it("states spent and received separately when the server splits them", () => {
    expect(
      describeFilterTotal({
        totalAmount: 52300,
        totalCredits: 1500,
        count: 530,
        debitCount: 523,
        creditCount: 7,
      }),
    ).toBe(
      "Spent: 52,300.00 across 523 debit(s) · Received: 1,500.00 across 7 credit(s)",
    );
  });

  it("falls back to the overall count when per-type counts are missing", () => {
    expect(
      describeFilterTotal({ totalAmount: 100, totalCredits: 0, count: 4 }),
    ).toBe("Spent: 100.00 across 4 transaction(s) · Received: 0.00");
  });

  it("keeps the old sentence against a server without credit totals", () => {
    expect(describeFilterTotal({ totalAmount: 100, count: 4 })).toBe(
      "Filter total (debits + credits): 100.00  across 4 transaction(s)",
    );
  });
});

describe("categoryPieData — which breakdown the pie uses", () => {
  const rows = [
    { amount: 300, category: "Food", type: "debit" as const },
    { amount: 50000, category: "Salary", type: "credit" as const },
  ];
  const mixed = [
    { name: "Salary", total: 50000, count: 1 },
    { name: "Food", total: 300, count: 1 },
  ];

  it("ignores byCategory from a server that does not split credits", () => {
    // The live server's byCategory sums credits in, so a Salary credit
    // would show as spending under "whole filter".
    const pie = categoryPieData({ totalAmount: 50300, count: 2, byCategory: mixed }, rows);
    expect(pie.wholeFilter).toBe(false);
    expect(pie.data).toEqual([{ name: "Food", value: 300 }]);
  });

  it("uses the server breakdown once it reports totalCredits", () => {
    const pie = categoryPieData(
      {
        totalAmount: 300,
        totalCredits: 50000,
        count: 2,
        byCategory: [{ name: "Food", total: 300, count: 1 }, { name: "", total: 5, count: 1 }],
      },
      rows,
    );
    expect(pie.wholeFilter).toBe(true);
    expect(pie.data).toEqual([
      { name: "Food", value: 300 },
      { name: "Uncategorised", value: 5 },
    ]);
  });

  it("falls back to this page when the split server sends no categories", () => {
    const pie = categoryPieData({ totalAmount: 0, totalCredits: 0, count: 0, byCategory: [] }, rows);
    expect(pie.wholeFilter).toBe(false);
    expect(pie.data).toEqual([{ name: "Food", value: 300 }]);
  });

  it("falls back to this page when totals are missing", () => {
    expect(categoryPieData(null, rows)).toEqual({
      wholeFilter: false,
      data: [{ name: "Food", value: 300 }],
    });
  });
});
