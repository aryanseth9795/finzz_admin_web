import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield } from "lucide-react";
import { adminLoginApi, describeLoginError } from "../api/adminApi";
import {
  PIN_LENGTH,
  applyPaste,
  formatRetry,
  isComplete,
  pinValue,
  sanitizePinChar,
  wrongPinMessage,
} from "./pinInput";

const EMPTY_CELLS = () => Array<string>(PIN_LENGTH).fill("");

export default function LoginPage() {
  const [cells, setCells] = useState<string[]>(EMPTY_CELLS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
  // Legacy fallback: the server still accepts a long secret key.
  const [useSecret, setUseSecret] = useState(false);
  const [secret, setSecret] = useState("");
  // Epoch ms at which a server lockout ends; null when not locked out.
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const submitting = useRef(false);

  const remaining = lockUntil
    ? Math.max(0, Math.ceil((lockUntil - now) / 1000))
    : 0;
  const locked = remaining > 0;

  const focusCell = useCallback((i: number) => {
    const el = inputs.current[Math.min(Math.max(i, 0), PIN_LENGTH - 1)];
    el?.focus();
    el?.select();
  }, []);

  // Live lockout countdown; lifts the lock (and the error) when it hits 0.
  useEffect(() => {
    if (lockUntil === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= lockUntil) {
        setLockUntil(null);
        setError("");
        setCells(EMPTY_CELLS());
        // Inputs are re-enabled on the next render; focus after that.
        setTimeout(() => focusCell(0), 0);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockUntil, focusCell]);

  const attempt = async (credential: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setLoading(true);

    try {
      await adminLoginApi(credential);
      navigate("/", { replace: true });
    } catch (err) {
      // describeLoginError, not describeError: on the login screen a 401 means
      // a wrong PIN, not "Your session expired".
      const { message, retryAfterSeconds, attemptsLeft } =
        describeLoginError(err);
      setCells(EMPTY_CELLS());
      setSecret("");

      if (retryAfterSeconds !== undefined) {
        const t = Date.now();
        setNow(t);
        setLockUntil(t + retryAfterSeconds * 1000);
        setError("");
      } else {
        if (attemptsLeft !== undefined) {
          // attemptsLeft 0 reads as "Too many attempts": the server's lock
          // (a 429 with a retry time) arrives on the next try.
          setError(
            wrongPinMessage(attemptsLeft, useSecret ? "secret key" : "PIN"),
          );
        } else {
          setError(message);
        }
        if (!useSecret) setTimeout(() => focusCell(0), 0);
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submit = (pinCells: string[]) => {
    if (isComplete(pinCells)) void attempt(pinValue(pinCells));
  };

  const handleChange = (i: number, raw: string) => {
    // Take the last typed character so overtyping a filled cell replaces it.
    const ch = sanitizePinChar(raw.slice(-1));
    if (raw && !ch) return; // rejected character
    const next = [...cells];
    next[i] = ch;
    setCells(next);
    if (ch) {
      if (isComplete(next)) submit(next);
      else focusCell(i + 1);
    }
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !cells[i] && i > 0) {
      e.preventDefault();
      const next = [...cells];
      next[i - 1] = "";
      setCells(next);
      focusCell(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (loading) return;
    const next = applyPaste(e.clipboardData.getData("text"));
    setCells(next);
    if (isComplete(next)) submit(next);
    else focusCell(next.findIndex((c) => !c));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (useSecret) {
      if (secret && !locked) void attempt(secret);
    } else {
      submit(cells);
    }
  };

  const toggleMode = () => {
    setUseSecret((u) => !u);
    setError("");
    setSecret("");
    setCells(EMPTY_CELLS());
  };

  // The alert text is constant while locked, so it is announced once; the
  // ticking countdown lives outside the alert.
  const shownError = locked ? "Too many attempts." : error;
  const inputsDisabled = locked;

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
          <span id="pin-label">
            {useSecret ? "Enter admin secret key" : "Enter admin PIN"}
          </span>
        </motion.p>

        <form onSubmit={handleSubmit}>
          {shownError && (
            <motion.p
              id="login-error"
              role="alert"
              className="login-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {shownError}
            </motion.p>
          )}

          {locked && (
            <p
              className="login-error"
              aria-live="off"
              style={{ marginTop: -8 }}
            >
              Try again in {formatRetry(remaining)}
            </p>
          )}

          {useSecret ? (
            <input
              id="admin-secret"
              name="admin-secret"
              type="password"
              className="login-input"
              autoComplete="current-password"
              aria-labelledby="pin-label"
              aria-invalid={Boolean(shownError)}
              aria-describedby={shownError ? "login-error" : undefined}
              placeholder="Secret key"
              value={secret}
              disabled={inputsDisabled}
              readOnly={loading}
              autoFocus
              onChange={(e) => setSecret(e.target.value)}
            />
          ) : (
            <motion.div
              className="pin-row"
              role="group"
              aria-labelledby="pin-label"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              {cells.map((c, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  id={`pin-${i}`}
                  name={`pin-${i}`}
                  type={reveal ? "text" : "password"}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  spellCheck={false}
                  className={`pin-cell${c ? " pin-cell-filled" : ""}`}
                  aria-label={`PIN character ${i + 1} of ${PIN_LENGTH}`}
                  aria-invalid={Boolean(shownError)}
                  aria-describedby={shownError ? "login-error" : undefined}
                  value={c}
                  disabled={inputsDisabled}
                  readOnly={loading}
                  autoFocus={i === 0}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                />
              ))}
              <button
                type="button"
                className="pin-toggle"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide PIN" : "Show PIN"}
                aria-pressed={reveal}
              >
                {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="login-btn"
            disabled={
              loading || locked || (useSecret ? !secret : !isComplete(cells))
            }
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
            {loading ? "Authenticating..." : "Unlock"}
          </motion.button>

          <button
            type="button"
            onClick={toggleMode}
            disabled={loading}
            style={{
              display: "block",
              margin: "16px auto 0",
              padding: 0,
              border: "none",
              background: "transparent",
              color: "var(--text-on-dark-secondary)",
              fontFamily: "inherit",
              fontSize: 13,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {useSecret ? "Use PIN instead" : "Use secret key instead"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
