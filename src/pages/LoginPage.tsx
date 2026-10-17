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
} from "./pinInput";

const EMPTY_CELLS = () => Array<string>(PIN_LENGTH).fill("");

export default function LoginPage() {
  const [cells, setCells] = useState<string[]>(EMPTY_CELLS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
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

  const submit = async (pinCells: string[]) => {
    if (submitting.current || !isComplete(pinCells)) return;
    submitting.current = true;
    setError("");
    setLoading(true);

    try {
      await adminLoginApi(pinValue(pinCells));
      navigate("/", { replace: true });
    } catch (err) {
      // describeLoginError, not describeError: on the login screen a 401 means
      // a wrong PIN, not "Your session expired".
      const { message, retryAfterSeconds, attemptsLeft } =
        describeLoginError(err);
      setCells(EMPTY_CELLS());

      if (retryAfterSeconds !== undefined) {
        const t = Date.now();
        setNow(t);
        setLockUntil(t + retryAfterSeconds * 1000);
        setError("");
      } else {
        if (attemptsLeft !== undefined) {
          setError(
            `Wrong PIN · ${attemptsLeft} ${
              attemptsLeft === 1 ? "attempt" : "attempts"
            } left`,
          );
        } else {
          setError(message);
        }
        setTimeout(() => focusCell(0), 0);
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleChange = (i: number, raw: string) => {
    // Take the last typed character so overtyping a filled cell replaces it.
    const ch = sanitizePinChar(raw.slice(-1));
    if (raw && !ch) return; // rejected character
    const next = [...cells];
    next[i] = ch;
    setCells(next);
    if (ch) {
      if (isComplete(next)) void submit(next);
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
    const next = applyPaste(e.clipboardData.getData("text"));
    setCells(next);
    if (isComplete(next)) void submit(next);
    else focusCell(next.findIndex((c) => !c));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(cells);
  };

  const shownError = locked
    ? `Too many attempts. Try again in ${formatRetry(remaining)}`
    : error;
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
          Enter admin PIN
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

          <motion.div
            className="pin-row"
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
                maxLength={1}
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

          <motion.button
            type="submit"
            className="login-btn"
            disabled={loading || locked || !isComplete(cells)}
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
        </form>
      </motion.div>
    </div>
  );
}
