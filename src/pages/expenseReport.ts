import type { Pagination, ExpenseTotals } from "../api/adminApi";

/** Indian-locale amount, no symbol (jsPDF's Helvetica cannot encode ₹). */
export const formatAmount = (value: number): string =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * The sentence that states what the exported table actually contains.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * The PDF was headed `Period: All Time` and printed a `Total Amount`, but both
 * the table and the total came from ONE PAGE of 50 rows. On a 500-row filter
 * it reported a tenth of the real figure under an explicit claim to cover
 * everything — in a document that detaches from the UI and gets filed,
 * emailed and cited, carrying nothing that would reveal the truncation.
 *
 * Extracted as a pure function precisely so it can be tested: the arithmetic
 * of "which rows am I showing" is the part that was wrong.
 */
export const describeTableScope = (
  page: number,
  rowsOnPage: number,
  pagination: Pagination | null,
  pageSize = 50,
): string => {
  const totalRows = pagination?.total ?? rowsOnPage;
  const totalPages = pagination?.pages ?? 1;

  if (rowsOnPage === 0) {
    return "No transactions match this filter.";
  }

  if (totalRows <= rowsOnPage) {
    return `Table below shows all ${totalRows} matching transaction(s).`;
  }

  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = (page - 1) * pageSize + rowsOnPage;
  return `Table below shows rows ${firstRow}-${lastRow} of ${totalRows} (page ${page} of ${totalPages}).`;
};

/**
 * The headline total for the selected filter.
 *
 * Comes from the SERVER's aggregate over the whole filtered set, because a
 * client cannot compute a total it does not hold. Returns an explicit
 * "unavailable" rather than silently falling back to the page sum — falling
 * back is what produced the wrong number in the first place.
 */
export const describeFilterTotal = (totals: ExpenseTotals | null): string => {
  if (!totals) return "Filter total: unavailable";
  // Older servers send one undivided total; keep the old sentence for them.
  if (typeof totals.totalCredits !== "number") {
    return `Filter total: ${formatAmount(totals.totalAmount)}  across ${totals.count} transaction(s)`;
  }
  const spent =
    typeof totals.debitCount === "number"
      ? `across ${totals.debitCount} debit(s)`
      : `across ${totals.count} transaction(s)`;
  const received =
    typeof totals.creditCount === "number"
      ? ` across ${totals.creditCount} credit(s)`
      : "";
  return `Spent: ${formatAmount(totals.totalAmount)} ${spent} · Received: ${formatAmount(totals.totalCredits)}${received}`;
};

/** The fields of an expense row the report helpers read. */
export interface ExpenseRow {
  amount?: number;
  date?: string;
  category?: string;
  type?: "debit" | "credit";
}

/** Missing `type` is a debit (legacy rows predate the field). */
export const isCredit = (row: { type?: string }): boolean =>
  row.type === "credit";

const amountOf = (row: { amount?: number }): number => Number(row.amount) || 0;

/** Sum of the DEBIT rows actually printed. Labelled "Page spent". */
export const pageTotal = (rows: ExpenseRow[]): number =>
  rows.reduce((sum, row) => (isCredit(row) ? sum : sum + amountOf(row)), 0);

/** Sum of the CREDIT rows actually printed. Labelled "Page received". */
export const pageCredits = (rows: ExpenseRow[]): number =>
  rows.reduce((sum, row) => (isCredit(row) ? sum + amountOf(row) : sum), 0);

/** Expenses are stored at UTC midnight, so format the UTC calendar day. */
export const formatExpenseDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Debit totals per UTC day, oldest first. Keyed on the full date so the same
 * day in different years stays two bars; the year is shown only when needed.
 */
export const dailyDebitTotals = (
  rows: ExpenseRow[],
): { key: string; label: string; total: number }[] => {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (isCredit(row) || !row.date) continue;
    const d = new Date(row.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + amountOf(row));
  }
  const keys = [...byDay.keys()].sort();
  const oneYear = new Set(keys.map((k) => k.slice(0, 4))).size <= 1;
  return keys.map((key) => ({
    key,
    label: new Date(`${key}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      ...(oneYear ? {} : { year: "numeric" as const }),
      timeZone: "UTC",
    }),
    total: byDay.get(key) ?? 0,
  }));
};

/** Debit totals per category for the rows held, largest first. */
export const categoryDebitTotals = (
  rows: ExpenseRow[],
): { name: string; value: number }[] => {
  const byCat = new Map<string, number>();
  for (const row of rows) {
    if (isCredit(row)) continue;
    const name = row.category || "Uncategorised";
    byCat.set(name, (byCat.get(name) ?? 0) + amountOf(row));
  }
  return [...byCat.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const describePeriod = (startDate: string, endDate: string): string =>
  startDate || endDate
    ? `Period: ${startDate || "earliest"} to ${endDate || "today"}`
    : "Period: All time";
