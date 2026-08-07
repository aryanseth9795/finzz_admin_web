import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel, for finer-grained boundaries. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Human label for the region this boundary protects. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions.
 *
 * THE PROBLEM THIS SOLVES
 * There was no error boundary anywhere: `main.tsx` rendered
 * `<StrictMode><App /></StrictMode>` with nothing between. React 19 unmounts
 * the ENTIRE tree on an uncaught render error, so a single bad field produced
 * a completely blank white page with no message and no navigation.
 *
 * That was not hypothetical. `DashboardPage` — the screen shown immediately
 * after login — did:
 *
 *     stats.totalUsers.toLocaleString()
 *
 * on an untyped response, four times, with no optional chaining. Any missing
 * field threw during render and blanked the app; a hard reload reproduced it.
 *
 * Two boundaries are used: one above the router so a catastrophic failure
 * still renders something, and one inside the layout so a single page's crash
 * leaves the sidebar navigable — the difference between "the app is broken"
 * and "this page is broken".
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for a crash reporter. Deliberately explicit rather than silent, so
    // wiring Sentry is a one-line change here.
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="error-state" role="alert">
        <h2 className="error-state-title">Something went wrong</h2>
        <p className="error-state-message">
          {this.props.label
            ? `The ${this.props.label} could not be displayed.`
            : "This page could not be displayed."}
        </p>
        <p className="error-state-detail">{error.message}</p>
        <div className="error-state-actions">
          <button className="btn btn-primary" onClick={this.reset}>
            Try again
          </button>
          <button
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
