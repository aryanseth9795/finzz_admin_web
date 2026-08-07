import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { adminLoginApi, describeError } from "../api/adminApi";

export default function LoginPage() {
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLoginApi(secretKey);
      navigate("/", { replace: true });
    } catch (err) {
      // Distinguishes "wrong key", "rate limited", "server unreachable" and
      // "timed out" — all of which previously read "Invalid secret key",
      // sending the admin looking for a credential problem that did not exist.
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="login-logo"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Finzz
        </motion.div>
        <motion.p
          className="login-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Admin Dashboard
        </motion.p>

        <form onSubmit={handleSubmit}>
          {error && (
            <motion.p
              className="login-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label htmlFor="admin-secret" className="sr-only">
              Admin secret key
            </label>
            <input
              id="admin-secret"
              name="admin-secret"
              type="password"
              className="login-input"
              placeholder="Enter admin secret key..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              /**
               * Without a name, an id and autoComplete, no password manager
               * could save or fill this credential — which for a shared secret
               * actively encourages storing it somewhere less safe.
               */
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              autoFocus
            />
          </motion.div>

          <motion.button
            type="submit"
            className="login-btn"
            disabled={loading || !secretKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield
              size={18}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
            {loading ? "Authenticating..." : "Access Dashboard"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
