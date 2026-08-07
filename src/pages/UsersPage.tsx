import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eye, Trash2 } from "lucide-react";
import {
  getAllUsersApi,
  deleteUserApi,
  describeError,
  type AdminUser,
  type Pagination as PaginationMeta,
} from "../api/adminApi";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/ConfirmDialog";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllUsersApi({
        page,
        limit: 15,
        // Capped: the server escapes the value into `$regex`, but a bounded
        // term also keeps the query cheap and the UI predictable.
        search: search.trim().slice(0, 64),
      });
      setUsers(res.data.users ?? []);
      setPagination(res.data.pagination);
    } catch (err) {
      // Was `console.error` alone, so a 500 from an unescaped regex — which
      // an unbalanced "(" in the search box used to cause — rendered as an
      // empty table with no explanation.
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(loadUsers, 300);
    return () => clearTimeout(debounce);
  }, [loadUsers]);

  /**
   * Deleting a user is irreversible and reaches other people's data.
   *
   * `window.confirm()` was the only guard: one keystroke to dismiss, no
   * summary of what would be destroyed, no undo. That is the weakest
   * affordance the platform offers, applied to the most consequential action
   * in the panel — while the notification broadcast, which is also
   * irreversible, got a purpose-built modal.
   *
   * The server-side cascade now removes ten collections in one transaction,
   * so this no longer leaves dangling references that crash the mobile app.
   * It still permanently destroys a person's financial history, and shared
   * chats with their counterparties, so the dialog states that plainly and
   * requires the name to be typed.
   */
  const confirmDelete = async (user: AdminUser) => {
    try {
      await deleteUserApi(user._id);
      toast.success(`Deleted ${user.name}`);
      setPendingDelete(null);
      void loadUsers();
    } catch (err) {
      toast.error(describeError(err));
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
                ({pagination?.total ?? 0})
              </span>
            </h3>
            <div className="search-wrapper">
              <Search />
              <input
                type="text"
                aria-label="Search users by name or phone"
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

          {/* Loading, error and empty are three distinct states. */}
          {loading ? (
            <div className="loading-container" aria-busy="true">
              <div className="spinner" />
              <span className="sr-only">Loading users</span>
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <h3 className="error-state-title">Could not load users</h3>
              <p className="error-state-message">{error}</p>
              <div className="error-state-actions">
                <button className="btn btn-primary" onClick={loadUsers}>
                  Retry
                </button>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="error-state">
              <h3 className="error-state-title">No users found</h3>
              <p className="error-state-message">
                {search
                  ? `Nothing matches "${search}".`
                  : "No users have registered yet."}
              </p>
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
                              title="View details"
                              aria-label={`View details for ${user.name}`}
                              onClick={() => navigate(`/users/${user._id}`)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="table-action-btn delete"
                              title="Delete user"
                              aria-label={`Delete ${user.name}`}
                              onClick={() => setPendingDelete(user)}
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

              <Pagination
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                rowCount={users.length}
              />
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            destructive
            title="Delete this user permanently?"
            confirmLabel="Delete user"
            requireTyped={pendingDelete.name}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => confirmDelete(pendingDelete)}
            message={
              <>
                <p>
                  This permanently deletes <strong>{pendingDelete.name}</strong>{" "}
                  ({pendingDelete.phone}) and everything belonging to them:
                </p>
                <ul className="modal-list">
                  <li>Every expense and monthly ledger</li>
                  <li>Every transaction they sent or received</li>
                  <li>Shared chats — including the counterparty's copy</li>
                  <li>Friend connections and pending requests</li>
                  <li>Pool memberships and the entries they added</li>
                </ul>
                <p className="modal-warning">
                  This cannot be undone, and it affects other users' records.
                </p>
              </>
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
