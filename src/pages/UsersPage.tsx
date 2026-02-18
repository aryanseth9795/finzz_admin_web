import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eye, Trash2 } from "lucide-react";
import { getAllUsersApi, deleteUserApi } from "../api/adminApi";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllUsersApi({ page, limit: 15, search });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(loadUsers, 300);
    return () => clearTimeout(debounce);
  }, [loadUsers]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete user "${name}" and all their data? This cannot be undone.`,
      )
    )
      return;

    try {
      await deleteUserApi(id);
      toast.success(`User "${name}" deleted`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete user");
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
          Users
        </motion.h1>
        <p className="page-subtitle">Manage all registered users</p>
      </div>

      <div className="page-content">
        <motion.div
          className="data-table-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="data-table-header">
            <h3 className="data-table-title">
              All Users{" "}
              <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                ({pagination.total || 0})
              </span>
            </h3>
            <div className="search-wrapper">
              <Search />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
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
                    <th>User</th>
                    <th>Phone</th>
                    <th>Friends</th>
                    <th>Push Token</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {users.map((user, index) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.03,
                        }}
                      >
                        <td>
                          <div className="table-user-cell">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt=""
                                className="table-avatar"
                              />
                            ) : (
                              <div className="table-avatar-placeholder">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="table-user-name">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.phone}</td>
                        <td>{user.friends?.length || 0}</td>
                        <td>
                          {user.pushToken ? (
                            <span className="badge success">Active</span>
                          ) : (
                            <span className="badge warning">None</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action-btn view"
                              title="View Details"
                              onClick={() => navigate(`/users/${user._id}`)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="table-action-btn delete"
                              title="Delete User"
                              onClick={() => handleDelete(user._id, user.name)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {(page - 1) * 15 + 1}-
                    {Math.min(page * 15, pagination.total)} of{" "}
                    {pagination.total}
                  </div>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-btn"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    {Array.from(
                      { length: Math.min(pagination.pages, 5) },
                      (_, i) => i + 1,
                    ).map((p) => (
                      <button
                        key={p}
                        className={`pagination-btn ${p === page ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
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
