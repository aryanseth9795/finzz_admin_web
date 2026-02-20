import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from "lucide-react";
import { getAdminPoolDetailApi } from "../api/adminApi";

export default function PoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoolDetail();
  }, [id]);

  const loadPoolDetail = async () => {
    if (!id) return;
    try {
      const res = await getAdminPoolDetailApi(id);
      setData(res.data);
    } catch (error) {
      console.error("Failed to load pool details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!data) return null;

  const { pool, stats, transactions } = data;

  return (
    <>
      <div className="page-header">
        <motion.button
          className="btn btn-outline"
          style={{ marginBottom: 12 }}
          onClick={() => navigate("/pools")}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft size={18} /> Back to Pools
        </motion.button>
      </div>

      <div className="page-content">
        {/* Pool Header Info */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                {pool.name}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  color: "var(--text-secondary)",
                  fontSize: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={16} />
                  Admin: {pool.admin?.name || "Unknown"}
                </div>
              </div>
              {pool.description && (
                <p style={{ marginTop: 12, color: "var(--text-secondary)" }}>
                  {pool.description}
                </p>
              )}
              {pool.rules && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 14,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4 }}>
                    Rules:
                  </strong>
                  {pool.rules}
                </div>
              )}
            </div>
            <span
              className={`badge ${
                pool.status === "active" ? "success" : "warning"
              }`}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {pool.status || "active"}
            </span>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="detail-cards-grid"
          style={{ marginTop: 16 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-card" style={{ background: "white" }}>
            <div className="stat-icon info">
              <Wallet size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Net Balance</div>
              <div
                className="stat-value"
                style={{
                  color:
                    stats.netBalance >= 0 ? "var(--success)" : "var(--error)",
                }}
              >
                ₹{Math.abs(stats.netBalance)?.toLocaleString() || 0}
                {stats.netBalance < 0 ? " (Negative)" : ""}
              </div>
            </div>
          </div>

          <div className="stat-card" style={{ background: "white" }}>
            <div className="stat-icon success">
              <ArrowDownRight size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Credited</div>
              <div className="stat-value text-success">
                ₹{stats.totalCredited?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div className="stat-card" style={{ background: "white" }}>
            <div className="stat-icon warning">
              <ArrowUpRight size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Debited</div>
              <div className="stat-value text-error">
                ₹{stats.totalDebited?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 20,
            marginTop: 20,
          }}
        >
          {/* Members Table */}
          <motion.div
            className="data-table-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="data-table-header">
              <h3
                className="data-table-title"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Users size={18} /> Members ({pool.members?.length || 0})
              </h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ textAlign: "right" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {pool.members?.map((member: any) => (
                  <tr key={member._id || member.userId}>
                    <td>
                      <div className="table-user-cell">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt=""
                            className="table-avatar"
                          />
                        ) : (
                          <div className="table-avatar-placeholder">
                            {member.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="table-user-name">
                          {member.name || `Unknown Member`}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {pool.admin?._id === member._id ? (
                        <span
                          className="badge primary"
                          style={{ fontSize: 11 }}
                        >
                          Admin
                        </span>
                      ) : (
                        <span
                          className="badge secondary"
                          style={{ fontSize: 11 }}
                        >
                          Member
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Transactions Table */}
          <motion.div
            className="data-table-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="data-table-header">
              <h3 className="data-table-title">Recent Transactions</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((tx: any) => (
                  <tr key={tx._id}>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 13 }}
                    >
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="table-user-cell">
                        <div
                          className="table-avatar-placeholder"
                          style={{ width: 24, height: 24, fontSize: 10 }}
                        >
                          {tx.addedBy?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div
                          className="table-user-name"
                          style={{ fontSize: 13 }}
                        >
                          {tx.addedBy?.name}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 13 }}
                    >
                      {tx.remarks || "-"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color:
                          tx.type === "credit"
                            ? "var(--success)"
                            : "var(--error)",
                      }}
                    >
                      {tx.type === "credit" ? "+" : "-"}₹
                      {tx.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!transactions?.length && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        color: "var(--text-tertiary)",
                        padding: 24,
                      }}
                    >
                      No transactions found for this pool
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        </div>
      </div>
    </>
  );
}
