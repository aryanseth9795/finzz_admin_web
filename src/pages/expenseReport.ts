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
export const describeFilterTotal = (totals: ExpenseTotals | null): string =>
  totals
    ? `Filter total: ${formatAmount(totals.totalAmount)}  across ${totals.count} transaction(s)`
    : "Filter total: unavailable";

/** Sum of the rows actually printed. Always labelled "Page total". */
export const pageTotal = (rows: { amount?: number }[]): number =>
  rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

export const describePeriod = (startDate: string, endDate: string): string =>
  startDate || endDate
    ? `Period: ${startDate || "earliest"} to ${endDate || "today"}`
    : "Period: All time";
