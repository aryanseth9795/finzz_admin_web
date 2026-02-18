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
import { getAllExpensesApi, getAllUsersApi } from "../api/adminApi";
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
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch users for dropdown
  useEffect(() => {
    getAllUsersApi({ limit: 1000 }).then((res) => {
      setUsers(res.data.users);
    });
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 }; // Increased limit for better reporting
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedUser) params.userId = selectedUser;

      const res = await getAllExpensesApi(params);
      setExpenses(res.data.expenses);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, selectedUser]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Expense Report", 14, 22);

    // Meta Info
    doc.setFontSize(11);
    doc.setTextColor(100);

    let yPos = 30;

    if (selectedUser) {
      const user = users.find((u) => u._id === selectedUser);
      doc.text(
        `User: ${user?.name || "Unknown"} (${user?.phone || ""})`,
        14,
        yPos,
      );
      yPos += 6;
    } else {
      doc.text("User: All Users", 14, yPos);
      yPos += 6;
    }

    if (startDate || endDate) {
      doc.text(
        `Period: ${startDate || "Start"} to ${endDate || "Now"}`,
        14,
        yPos,
      );
      yPos += 10;
    } else {
      doc.text("Period: All Time", 14, yPos);
      yPos += 10;
    }

    // Calculate Total
    const totalAmount = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0,
    );
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, yPos);

    // Table
    const tableData = expenses.map((exp) => [
      new Date(exp.date).toLocaleDateString(),
      exp.category || "Uncategorized",
      exp.remarks || "-",
      exp.amount?.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPos + 10,
      head: [["Date", "Category", "Remarks", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      foot: [["", "", "Total", totalAmount.toFixed(2)]],
    });

    doc.save(`expenses_report_${new Date().toISOString().split("T")[0]}.pdf`);
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
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginRight: 8,
              }}
            >
              User:
            </label>
            <select
              className="form-input"
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
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginRight: 8,
              }}
            >
              From:
            </label>
            <input
              type="date"
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
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginRight: 8,
              }}
            >
              To:
            </label>
            <input
              type="date"
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
                    formatter={(value: number | undefined) => [
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
                    formatter={(value: number | undefined) => [
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
                ({pagination.total || 0})
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
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
                              {exp.userId?.name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </div>
                            <div>
                              <div
                                className="table-user-name"
                                style={{ fontSize: 13 }}
                              >
                                {exp.userId?.name || "Unknown"}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-tertiary)",
                                }}
                              >
                                {exp.userId?.phone}
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

              {pagination.pages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Page {page} of {pagination.pages}
                  </div>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-btn"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="pagination-btn"
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
