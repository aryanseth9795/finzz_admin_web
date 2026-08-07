import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

/**
 * A real 404.
 *
 * The catch-all route was `<Navigate to="/" replace />`, so every unknown URL
 * silently redirected to the dashboard. A mistyped address, a stale bookmark
 * or a deleted user's detail link all looked like "you meant to go home"
 * rather than "that page does not exist" — which makes a broken link
 * impossible to distinguish from a working one.
 */
export default function NotFoundPage() {
  return (
    <div className="error-state" role="alert">
      <SearchX size={44} aria-hidden="true" />
      <h2 className="error-state-title">Page not found</h2>
      <p className="error-state-message">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div className="error-state-actions">
        <Link className="btn btn-primary" to="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
