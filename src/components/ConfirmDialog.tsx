import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  /** What will happen, in plain language. */
  message: React.ReactNode;
  confirmLabel?: string;
  /** When set, the user must type this exactly before confirming. */
  requireTyped?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * A confirmation dialog that is actually a dialog.
 *
 * The panel's existing confirmation modal had `role` and `aria-modal` absent,
 * no focus trap, no focus restoration and no Escape handler — so keyboard
 * focus stayed on the page behind the overlay and a keyboard user could tab
 * into and activate the form underneath while it was "open". Its only
 * dismissal was a mouse click.
 *
 * `requireTyped` exists because friction should scale with irreversibility: a
 * native `confirm()` is one keystroke away from destroying a user's entire
 * financial history, which is not a proportionate gate.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  requireTyped,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLElement | null>(null);
  // Remember what had focus so it can be restored on close — otherwise focus
  // returns to the top of the document and the user loses their place.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    initialFocusRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  // Escape to cancel, Tab cycled within the dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  const canConfirm = !requireTyped || typed.trim() === requireTyped.trim();

  const handleConfirm = async () => {
    if (!canConfirm || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className={`modal-icon ${destructive ? "danger" : "primary"}`}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h3 id="confirm-title" className="modal-title">
            {title}
          </h3>
        </div>

        <div id="confirm-message" className="modal-body">
          {message}
        </div>

        {requireTyped && (
          <div className="modal-confirm-field">
            <label htmlFor="confirm-typed">
              Type <strong>{requireTyped}</strong> to confirm
            </label>
            <input
              id="confirm-typed"
              className="form-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              ref={(el) => {
                initialFocusRef.current = el;
              }}
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            onClick={handleConfirm}
            disabled={!canConfirm || busy}
            ref={(el) => {
              if (!requireTyped) initialFocusRef.current = el;
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
