import { useState, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bell,
  Smartphone,
  Search,
  X,
  Users,
  User,
  Smile,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import {
  sendBulkNotificationApi,
  sendTargetedNotificationApi,
  getAllUsersApi,
} from "../api/adminApi";
import toast from "react-hot-toast";

type TargetType = "all" | "selected";

interface UserType {
  _id: string;
  name: string;
  phone: string;
  avatar?: string;
  pushToken?: string;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const [targetType, setTargetType] = useState<TargetType>("all");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, UserType>>(
    new Map(),
  );

  const [showEmojiPicker, setShowEmojiPicker] = useState<
    "title" | "body" | null
  >(null);

  const searchUsers = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await getAllUsersApi({ search: query, limit: 10 });
      setSearchResults(res.data.users);
    } catch (error) {
      console.error("Failed to search users", error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      searchUsers(search);
    }, 400);
    return () => clearTimeout(delay);
  }, [search, searchUsers]);

  const toggleUser = (user: UserType) => {
    const newMap = new Map(selectedUsers);
    if (newMap.has(user._id)) {
      newMap.delete(user._id);
    } else {
      newMap.set(user._id, user);
    }
    setSelectedUsers(newMap);
  };

  const removeUser = (id: string) => {
    const newMap = new Map(selectedUsers);
    newMap.delete(id);
    setSelectedUsers(newMap);
  };

  const onEmojiClick = (emojiObject: any) => {
    if (showEmojiPicker === "title") {
      setTitle((prev) => prev + emojiObject.emoji);
    } else if (showEmojiPicker === "body") {
      setBody((prev) => prev + emojiObject.emoji);
    }
    setShowEmojiPicker(null);
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (targetType === "selected" && selectedUsers.size === 0) {
      toast.error("Please select at least one user.");
      return;
    }

    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      let res;
      if (targetType === "all") {
        res = await sendBulkNotificationApi(title, body);
        toast.success(`Notification sent to ${res.data.sentCount} users!`);
      } else {
        const userIds = Array.from(selectedUsers.keys());
        res = await sendTargetedNotificationApi(userIds, title, body);
        toast.success(
          `Notification sent to ${res.data.sentCount} out of ${res.data.totalSelectedUsers} users!`,
        );
      }
      setLastResult({ ...res.data, targetType });
      setTitle("");
      setBody("");
      if (targetType === "selected") {
        setSelectedUsers(new Map());
        setSearch("");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header" onClick={() => setShowEmojiPicker(null)}>
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Notifications
        </motion.h1>
        <p className="page-subtitle">
          Send broadcast or targeted notifications to app users
        </p>
      </div>

      <div className="page-content">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          {/* Form */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="card-title" onClick={() => setShowEmojiPicker(null)}>
              <Bell
                size={18}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 8,
                }}
              />
              Compose Notification
            </h3>

            <form onSubmit={handleSubmit} className="notification-form">
              <div className="form-group" style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Title
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowEmojiPicker(
                        showEmojiPicker === "title" ? null : "title",
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: 4,
                    }}
                  >
                    <Smile size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New Update Available!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />

                <AnimatePresence>
                  {showEmojiPicker === "title" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{
                        position: "absolute",
                        zIndex: 100,
                        right: 0,
                        top: 40,
                      }}
                    >
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="form-group" style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Message
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowEmojiPicker(
                        showEmojiPicker === "body" ? null : "body",
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: 4,
                    }}
                  >
                    <Smile size={16} />
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. We've added exciting new features..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                />
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  {body.length}/500
                </div>

                <AnimatePresence>
                  {showEmojiPicker === "body" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{
                        position: "absolute",
                        zIndex: 100,
                        right: 0,
                        top: 40,
                      }}
                    >
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className="form-group"
                onClick={() => setShowEmojiPicker(null)}
              >
                <label className="form-label">Target Audience</label>
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value="all"
                      checked={targetType === "all"}
                      onChange={() => setTargetType("all")}
                    />
                    <Users size={16} /> All Users
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value="selected"
                      checked={targetType === "selected"}
                      onChange={() => setTargetType("selected")}
                    />
                    <User size={16} /> Selected Users
                  </label>
                </div>
              </div>

              <AnimatePresence>
                {targetType === "selected" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                    onClick={() => setShowEmojiPicker(null)}
                  >
                    <div className="form-group">
                      <div
                        className="search-wrapper"
                        style={{ margin: "10px 0" }}
                      >
                        <Search
                          size={18}
                          style={{
                            color: "var(--text-tertiary)",
                            marginLeft: 8,
                          }}
                        />
                        <input
                          type="text"
                          className="search-input"
                          placeholder="Search users by name or phone..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          style={{
                            paddingLeft: 36,
                            border: "1px solid var(--border-color)",
                            borderRadius: 8,
                            padding: "10px 10px 10px 36px",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {searching && (
                        <div
                          style={{
                            padding: 10,
                            textAlign: "center",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Searching...
                        </div>
                      )}

                      {!searching && searchResults.length > 0 && (
                        <div
                          style={{
                            maxHeight: 200,
                            overflowY: "auto",
                            border: "1px solid var(--border-color)",
                            borderRadius: 8,
                            marginBottom: 16,
                          }}
                        >
                          {searchResults.map((user) => (
                            <div
                              key={user._id}
                              onClick={() => toggleUser(user)}
                              style={{
                                padding: "10px 12px",
                                borderBottom: "1px solid var(--border-color)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                background: selectedUsers.has(user._id)
                                  ? "var(--primary-light)"
                                  : "transparent",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {user.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {user.phone}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                {!user.pushToken && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "var(--warning)",
                                      background: "var(--warning-bg)",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    No Push Token
                                  </span>
                                )}
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.has(user._id)}
                                  readOnly
                                  style={{ pointerEvents: "none" }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!searching && search && searchResults.length === 0 && (
                        <div
                          style={{
                            padding: 10,
                            textAlign: "center",
                            color: "var(--text-secondary)",
                            marginBottom: 16,
                          }}
                        >
                          No users found.
                        </div>
                      )}

                      {selectedUsers.size > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              fontSize: 13,
                              marginBottom: 8,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Selected Users ({selectedUsers.size}):
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {Array.from(selectedUsers.values()).map((user) => (
                              <div
                                key={user._id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: "var(--surface)",
                                  border: "1px solid var(--border-color)",
                                  padding: "4px 8px",
                                  borderRadius: 16,
                                  fontSize: 12,
                                }}
                              >
                                {user.name}
                                <X
                                  size={14}
                                  style={{
                                    cursor: "pointer",
                                    color: "var(--text-tertiary)",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeUser(user._id);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="btn btn-primary"
                disabled={
                  loading ||
                  !title ||
                  (targetType === "selected" && selectedUsers.size === 0)
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setShowEmojiPicker(null)}
              >
                <Send size={16} />
                {loading
                  ? "Sending..."
                  : targetType === "all"
                    ? "Send to All Users"
                    : `Send to ${selectedUsers.size} Users`}
              </motion.button>
            </form>

            {/* Result */}
            {lastResult && (
              <motion.div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  background: "var(--success-bg)",
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--success)",
                    marginBottom: 4,
                  }}
                >
                  ✅ Notification Sent!
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Delivered to <strong>{lastResult.sentCount}</strong> out of{" "}
                  <strong>
                    {lastResult.totalUsersWithTokens ||
                      lastResult.totalSelectedUsers}
                  </strong>{" "}
                  {lastResult.targetType === "all" ? "total" : "selected"} users
                  with push tokens.
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowEmojiPicker(null)}
          >
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 className="card-title">
                <Smartphone
                  size={18}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 8,
                  }}
                />
                Preview
              </h3>

              <div className="notification-preview">
                <div className="preview-label">Push Notification</div>
                <div className="preview-notification">
                  <div className="preview-icon">
                    <Bell size={20} color="white" />
                  </div>
                  <div className="preview-content">
                    <div className="preview-title">
                      {title || "Notification Title"}
                    </div>
                    <div className="preview-body">
                      {body || "Your notification message will appear here..."}
                    </div>
                    <div className="preview-time">now</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="card">
              <h3 className="card-title">💡 Tips</h3>
              <ul
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 2,
                  paddingLeft: 18,
                }}
              >
                <li>Keep titles under 50 characters for best visibility</li>
                <li>Use emojis to grab attention 🎉</li>
                <li>Notifications are sent only to users with push tokens</li>
                <li>
                  Users marked with "No Push Token" will not receive the
                  notification
                </li>
                <li>Consider time zones before sending</li>
                <li>Use for app updates, promotions, and announcements</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: "var(--surface)",
                padding: 24,
                borderRadius: "var(--radius-lg)",
                width: "100%",
                maxWidth: 400,
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border-color)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  color: "var(--text-primary)",
                }}
              >
                <div
                  style={{
                    background: "var(--primary-light)",
                    padding: 8,
                    borderRadius: "50%",
                    color: "var(--primary)",
                  }}
                >
                  <Send size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Confirm Send</h3>
              </div>

              <p
                style={{
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to send this notification to{" "}
                <strong>
                  {targetType === "all"
                    ? "ALL users"
                    : `${selectedUsers.size} selected users`}
                </strong>
                ?
              </p>

              <div
                style={{
                  background: "var(--background)",
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  marginBottom: 24,
                  fontSize: 14,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Title:</span>{" "}
                  <strong>{title}</strong>
                </div>
                {body && (
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      Message:
                    </span>{" "}
                    {body}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={confirmSend}>
                  Confirm & Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
