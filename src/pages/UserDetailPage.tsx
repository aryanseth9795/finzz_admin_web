import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Phone, Receipt, Wallet, Users } from "lucide-react";
import {
  getUserDetailApi,
  describeError,
  type UserDetailResponse,
  type AdminLedger,
} from "../api/adminApi";

const COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * `useCallback` with `id` in the dependency list.
   *
   * The effect previously called a function declared OUTSIDE it and listed
   * only `[id]`, which `react-hooks/exhaustive-deps` flags — and that lint
   * rule had never run, because `npm run lint` crashed on an ESLint version
   * mismatch. It also never reset `loading` on an id change, so navigating
   * from one user to another showed the PREVIOUS user's name, phone, ledgers
   * and friends while the new request was in flight.
   */
  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getUserDetailApi(id);
      setData(res.data);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  // Was `return null` — a completely blank page on any failure, with no
  // message, no retry, and not even the back button from the success path.
  if (error || !data) {
    return (
      <div className="error-state" role="alert">
        <h2 className="error-state-title">Could not load this page</h2>
        <p className="error-state-message">{error ?? "No data was returned."}</p>
        <div className="error-state-actions">
          <button className="btn btn-primary" onClick={reload}>Retry</button>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  const { user, expenseSummary, pools, ledgers } = data;

  // Drop nulls left by deleted users, so a dangling reference renders one
  // fewer row instead of throwing on `friend.avatar`.
  const friends = (user.friends ?? []).filter(
    (f): f is NonNullable<typeof f> => Boolean(f),
  );

  // Prepare ledger data for mini pie
  const ledgerPieData = ledgers?.slice(0, 5).map((l: AdminLedger) => ({
    name: `${l.year}-${String(l.month).padStart(2, "0")}`,
    value: l.totalExpenses || 0,
  }));

  return (
    <>
      <div className="page-header">
        <motion.button
          className="btn btn-outline"
          style={{ marginBottom: 12 }}
          onClick={() => navigate("/users")}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft size={18} /> Back to Users
        </motion.button>
      </div>

      <div className="page-content">
        {/* User Profile Header */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="user-detail-header">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="user-detail-avatar" />
            ) : (
              <div className="user-detail-avatar-placeholder">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="user-detail-info">
              <h2>{user.name}</h2>
              <p>
                <Phone
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 6,
                  }}
                />
                {user.phone}
              </p>
              <p style={{ marginTop: 4 }}>
                ID: <code style={{ fontSize: 12 }}>{user._id}</code>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          className="detail-cards-grid"
          style={{ marginTop: 16 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-card primary">
            <div className="stat-icon primary">
              <Receipt size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value">
                ₹{expenseSummary.totalAmount?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {expenseSummary.count || 0} entries
              </div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon success">
              <Wallet size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Pools</div>
              <div className="stat-value">{pools?.length || 0}</div>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon info">
              <Users size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Friends</div>
              <div className="stat-value">{friends.length}</div>
            </div>
          </div>
        </motion.div>

        {/* Ledgers + Pie */}
        <motion.div
          className="charts-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Ledgers Table */}
          <div className="data-table-container">
            <div className="data-table-header">
              <h3 className="data-table-title">Expense Ledgers</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {ledgers?.map((ledger: AdminLedger) => (
                  <tr key={ledger._id}>
                    <td>
                      {ledger.year}-{String(ledger.month).padStart(2, "0")}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          ledger.status === "open" ? "success" : "warning"
                        }`}
                      >
                        {ledger.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{ledger.totalExpenses?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
                {!ledgers?.length && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        textAlign: "center",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      No ledgers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Pie */}
          {ledgerPieData?.length > 0 && (
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Expense Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={ledgerPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1200}
                  >
                    {ledgerPieData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `₹${value.toLocaleString()}`,
                      "Amount",
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Friends */}
        {(friends.length > 0) && (
          <motion.div
            className="data-table-container"
            style={{ marginTop: 20 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="data-table-header">
              <h3 className="data-table-title">Friends</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Friend</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {friends.map((friend) => (
                  <tr key={friend._id}>
                    <td>
                      <div className="table-user-cell">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt=""
                            className="table-avatar"
                          />
                        ) : (
                          <div className="table-avatar-placeholder">
                            {friend.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div className="table-user-name">{friend.name}</div>
                      </div>
                    </td>
                    <td>{friend.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </>
  );
}
