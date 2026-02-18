import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, Bell, Smartphone } from "lucide-react";
import { sendBulkNotificationApi } from "../api/adminApi";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    if (
      !confirm(
        `Send this notification to ALL users?\n\nTitle: ${title}\nBody: ${body}`,
      )
    )
      return;

    setLoading(true);
    try {
      const res = await sendBulkNotificationApi(title, body);
      setLastResult(res.data);
      toast.success(`Notification sent to ${res.data.sentCount} users!`);
      setTitle("");
      setBody("");
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
      <div className="page-header">
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Notifications
        </motion.h1>
        <p className="page-subtitle">
          Send broadcast notifications to all app users
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
            <h3 className="card-title">
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
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New Update Available!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
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
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !title || !body}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Send size={16} />
                {loading ? "Sending..." : "Send to All Users"}
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
                  <strong>{lastResult.totalUsersWithTokens}</strong> users with
                  push tokens.
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                <li>Consider time zones before sending</li>
                <li>Use for app updates, promotions, and announcements</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
