import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, Activity, XCircle, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllPoolsApi, getPoolDashboardStatsApi } from "../api/adminApi";

export default function PoolsPage() {
  const navigate = useNavigate();
  const [pools, setPools] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPools();
  }, [page]);

  const loadPools = async () => {
    setLoading(true);
    try {
      const [poolsRes, statsRes] = await Promise.all([
        getAllPoolsApi({ page, limit: 20 }),
        getPoolDashboardStatsApi(),
      ]);
      setPools(poolsRes.data.pools);
      setPagination(poolsRes.data.pagination);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error("Failed to load pools:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Pools
        </motion.h1>
        <p className="page-subtitle">View all user-created pools</p>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {stats && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 32,
                  overflowX: "auto",
                  paddingBottom: 8,
                }}
              >
                <div className="stat-card" style={{ minWidth: 200, flex: 1 }}>
                  <div className="stat-header">
                    <div
                      className="stat-icon"
                      style={{
                        background: "rgba(34, 197, 94, 0.1)",
                        color: "#22c55e",
                      }}
                    >
                      <Activity size={20} />
                    </div>
                    <span className="stat-title">Active Pools</span>
                  </div>
                  <div className="stat-value">{stats.activePools}</div>
                </div>

                <div className="stat-card" style={{ minWidth: 200, flex: 1 }}>
                  <div className="stat-header">
                    <div
                      className="stat-icon"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                      }}
                    >
                      <XCircle size={20} />
                    </div>
                    <span className="stat-title">Closed Pools</span>
                  </div>
                  <div className="stat-value">{stats.closedPools}</div>
                </div>

                <div className="stat-card" style={{ minWidth: 200, flex: 1 }}>
                  <div className="stat-header">
                    <div
                      className="stat-icon"
                      style={{
                        background: "rgba(234, 179, 8, 0.1)",
                        color: "#eab308",
                      }}
                    >
                      <Database size={20} />
                    </div>
                    <span className="stat-title">Net Balance</span>
                  </div>
                  <div className="stat-value">
                    ₹{stats.netBalance?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            )}

            <motion.div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
              }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06 },
                },
              }}
            >
              <AnimatePresence>
                {pools.map((pool) => (
                  <motion.div
                    key={pool._id}
                    className="card"
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.97 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.35 },
                      },
                    }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    layout
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/pools/${pool._id}`)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                          {pool.name}
                        </h3>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            marginTop: 2,
                          }}
                        >
                          by {pool.admin?.name || "Unknown"}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          pool.status === "active" ? "success" : "warning"
                        }`}
                      >
                        {pool.status || "active"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 24,
                        borderTop: "1px solid var(--border-light)",
                        paddingTop: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Users size={16} style={{ color: "var(--primary)" }} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          {pool.members?.length || 0} members
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Wallet size={16} style={{ color: "var(--success)" }} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          ₹{pool.totalBalance?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    {/* Member Avatars */}
                    {pool.members?.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid var(--border-light)",
                          gap: 4,
                        }}
                      >
                        {pool.members.slice(0, 5).map((m: any, i: number) =>
                          m.avatar ? (
                            <img
                              key={i}
                              src={m.avatar}
                              alt=""
                              className="table-avatar"
                              style={{
                                width: 30,
                                height: 30,
                                marginLeft: i > 0 ? -8 : 0,
                                border: "2px solid white",
                                objectFit: "cover",
                                borderRadius: "50%",
                              }}
                            />
                          ) : (
                            <div
                              key={i}
                              className="table-avatar-placeholder"
                              style={{
                                width: 30,
                                height: 30,
                                fontSize: 11,
                                marginLeft: i > 0 ? -8 : 0,
                                border: "2px solid white",
                              }}
                            >
                              {m.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          ),
                        )}
                        {pool.members.length > 5 && (
                          <div
                            className="table-avatar-placeholder"
                            style={{
                              width: 30,
                              height: 30,
                              fontSize: 10,
                              marginLeft: -8,
                              border: "2px solid white",
                              background: "var(--text-tertiary)",
                              color: "white",
                            }}
                          >
                            +{pool.members.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {pagination.pages > 1 && (
              <div
                className="pagination"
                style={{
                  marginTop: 20,
                  background: "white",
                  borderRadius: "var(--radius-lg)",
                }}
              >
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
      </div>
    </>
  );
}
