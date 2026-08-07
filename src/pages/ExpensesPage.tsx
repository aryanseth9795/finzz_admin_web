import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Calendar, Download } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAllExpensesApi,
  getAllUsersApi,
  describeError,
  type AdminUser,
  type AdminExpense,
  type Pagination as PaginationMeta,
  type ExpenseTotals,
  populatedUser,
} from "../api/adminApi";
import Pagination from "../components/Pagination";
import {
  formatAmount,
  describeTableScope,
  describeFilterTotal,
  describePeriod,
  pageTotal,
} from "./expenseReport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PIE_COLORS = [
  "#4F46E5",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export default function ExpensesPage() {
  // Typed, not `any[]`. The repo had no interface describing an API response
  // anywhere, which is why the always-empty `pools` array and the dashboard's
  // unguarded field access both went unnoticed.
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totals, setTotals] = useState<ExpenseTotals | null>(null);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Users for the filter dropdown.
   *
   * Was `getAllUsersApi({ limit: 1000 })` with a bare `.then()` and NO
   * `.catch()` — an unhandled promise rejection on every failure, and a
   * multi-megabyte response (full documents, including avatars and friend
   * arrays) fetched on every visit to render a `<select>` that uses two
   * fields. It also silently capped at 1,000, so user 1,001 could never be
   * selected and nothing indicated the list was truncated.
   *
   * `sort=name` plus a smaller page keeps it usable; the error is surfaced
   * rather than swallowed.
   */
  useEffect(() => {
    let cancelled = false;
    getAllUsersApi({ limit: 200, sort: "name" })
      .then((res) => {
        if (!cancelled) setUsers(res.data.users ?? []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllExpensesApi({
        page,
        limit: 50,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(selectedUser ? { userId: selectedUser } : {}),
      });
      setExpenses(res.data.expenses ?? []);
      setPagination(res.data.pagination);
      // Server-computed totals over the WHOLE filtered set — see the PDF
      // export below for why the page-derived version was wrong.
      setTotals(res.data.totals ?? null);
    } catch (err) {
      // Was `console.error` alone, so a failed request rendered as an empty
      // table indistinguishable from "no expenses match".
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, selectedUser]);

  /**
   * Export the current filter as a PDF.
   *
   * THE BUG THIS FIXES
   * The document was headed `Period: All Time` and printed a `Total Amount`,
   * but both the table and the total came from `expenses` — a SINGLE PAGE of
   * 50 rows. On a 500-row filter it reported one tenth of the real figure
   * under an explicit claim to cover everything, with no page indicator and no
   * row count.
   *
   * That is worse than an on-screen error because the output is a DOCUMENT: it
   * detaches from the UI, gets filed, emailed and cited, and nothing in the
   * artefact reveals the truncation.
   *
   * Two changes make it honest:
   *   1. The headline total is the server's aggregate over the whole filtered
   *      set (`totals.totalAmount`), because a client cannot compute a total
   *      it does not hold.
   *   2. The table states exactly what it contains — "rows 1–50 of 523" — so
   *      the page total and the filter total can never be mistaken for each
   *      other.
   */
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const generatedAt = new Date();

    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text("Expense Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    let yPos = 30;

    const line = (text: string) => {
      doc.text(text, 14, yPos);
      yPos += 5.5;
    };

    const selected = users.find((u) => u._id === selectedUser);
    line(
      selectedUser
        ? `User: ${selected?.name ?? "Unknown"}${selected?.phone ? ` (${selected.phone})` : ""}`
        : "User: All users",
    );
    line(describePeriod(startDate, endDate));
    line(`Generated: ${generatedAt.toLocaleString("en-IN")}`);

    yPos += 3;
    doc.setFontSize(11);
    doc.setTextColor(30);

    // The true figure for the selected filter — the server's aggregate over
    // the whole set, not a sum of the rows this client happens to hold.
    line(describeFilterTotal(totals));

    doc.setFontSize(9);
    doc.setTextColor(120);
    // The sentence that was missing. Without it a reader has no way to know
    // the table is a slice. Extracted and tested in expenseReport.test.ts —
    // the range arithmetic is the part that was wrong.
    line(describeTableScope(page, expenses.length, pagination));

    const printedTotal = pageTotal(expenses);

    autoTable(doc, {
      startY: yPos + 4,
      head: [["Date", "User", "Category", "Remarks", "Amount (INR)"]],
      body: expenses.map((exp) => [
        // Explicit locale: an unqualified toLocaleDateString produced a
        // different format on every machine, inside an exported document.
        new Date(exp.date).toLocaleDateString("en-IN"),
        typeof exp.userId === "object" && exp.userId
          ? (exp.userId.name ?? "—")
          : "—",
        exp.category || "Uncategorised",
        exp.remarks || "—",
        // "INR" in the header rather than "₹" in each cell: jsPDF's default
        // Helvetica cannot encode U+20B9, so the symbol rendered as garbage.
        formatAmount(Number(exp.amount) || 0),
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
      foot: [["", "", "", "Page total", formatAmount(printedTotal)]],
      footStyles: { fillColor: [241, 245, 249], textColor: 30 },
    });

    const stamp = generatedAt.toISOString().split("T")[0];
    doc.save(`finzz-expenses-${stamp}.pdf`);
  };

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Build category breakdown from visible expenses
  const categoryMap = expenses.reduce((acc: any, exp: any) => {
    const cat = exp.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const categoryPieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Daily breakdown for bar chart
  const dailyMap = expenses.reduce((acc: any, exp: any) => {
    const date = new Date(exp.date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    acc[date] = (acc[date] || 0) + exp.amount;
    return acc;
  }, {});

  const dailyBarData = Object.entries(dailyMap)
    .map(([date, total]) => ({ date, total }))
    .reverse();

  return (
    <>
      <div className="page-header">
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Expenses
        </motion.h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <p className="page-subtitle" style={{ margin: 0 }}>
            View and analyze all user expenses
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontSize: "13px" }}
            onClick={handleDownloadPDF}
            disabled={expenses.length === 0}
          >
            <Download size={16} style={{ marginRight: 6 }} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filters */}
        <motion.div
          className="card"
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Calendar size={18} style={{ color: "var(--text-secondary)" }} />

          {/* User Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label
              htmlFor="filter-user"
              style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}
            >
              User:
            </label>
            <select
              className="form-input"
              id="filter-user"
              style={{ width: "auto", padding: "6px 12px" }}
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label
              htmlFor="filter-from"
              style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}
            >
              From:
            </label>
            <input
              type="date"
              id="filter-from"
              className="form-input"
              style={{ width: "auto", padding: "6px 12px" }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label
              htmlFor="filter-to"
              style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}
            >
              To:
            </label>
            <input
              type="date"
              id="filter-to"
              className="form-input"
              style={{ width: "auto", padding: "6px 12px" }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {(startDate || endDate || selectedUser) && (
            <button
              className="btn btn-outline"
              style={{ padding: "6px 14px" }}
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedUser("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </motion.div>

        {/* Charts */}
        {expenses.length > 0 && (
          <motion.div
            className="charts-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Daily Bar */}
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Daily Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "none",
                    }}
                    formatter={(value: any) => [
                      `₹${(value || 0).toLocaleString()}`,
                      "Amount",
                    ]}
                  />
                  <Bar
                    dataKey="total"
                    fill="#4F46E5"
                    radius={[6, 6, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Pie */}
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">By Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {categoryPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `₹${(value || 0).toLocaleString()}`,
                      "Amount",
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          className="data-table-container"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="data-table-header">
            <h3 className="data-table-title">
              All Expenses{" "}
              <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                ({pagination?.total ?? 0})
              </span>
            </h3>
          </div>

          {/*
            Three distinct states: loading, error, and genuinely empty.
            Previously a failed request fell through to the empty table, so
            "the request broke" was indistinguishable from "nothing matched".
          */}
          {loading ? (
            <div className="loading-container" aria-busy="true">
              <div className="spinner" />
              <span className="sr-only">Loading expenses</span>
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <h3 className="error-state-title">Could not load expenses</h3>
              <p className="error-state-message">{error}</p>
              <div className="error-state-actions">
                <button className="btn btn-primary" onClick={loadExpenses}>
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Remarks</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {expenses.map((exp, i) => (
                      <motion.tr
                        key={exp._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                      >
                        <td>{new Date(exp.date).toLocaleDateString()}</td>
                        <td>
                          <div className="table-user-cell">
                            <div
                              className="table-avatar-placeholder"
                              style={{ width: 28, height: 28, fontSize: 11 }}
                            >
                              {populatedUser(exp.userId)?.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <div
                                className="table-user-name"
                                style={{ fontSize: 13 }}
                              >
                                {populatedUser(exp.userId)?.name ?? "Deleted user"}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-tertiary)",
                                }}
                              >
                                {populatedUser(exp.userId)?.phone ?? ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{exp.remarks || "-"}</td>
                        <td>
                          {exp.category ? (
                            <span className="badge primary">
                              {exp.category}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-tertiary)" }}>
                              -
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--danger)" }}>
                          ₹{exp.amount?.toFixed(2)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              <Pagination
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                rowCount={expenses.length}
              />
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
