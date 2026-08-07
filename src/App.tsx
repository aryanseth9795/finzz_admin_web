import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import { adminVerifyApi, setUnauthorizedHandler } from "./api/adminApi";

/**
 * Route-level code splitting.
 *
 * Every page was imported statically, so Vite emitted ONE bundle containing
 * the transitive closure of all of them. The login screen — the only route an
 * unauthenticated visitor can reach — downloaded, parsed and evaluated the
 * chart engine (recharts + d3), the PDF generator (jspdf), and the complete
 * Unicode emoji dataset (emoji-picker-react) before it could render a password
 * field.
 *
 * LoginPage stays eager: it is the entry point, and lazy-loading it would add
 * a round trip to the one screen that must appear instantly.
 */
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const PoolsPage = lazy(() => import("./pages/PoolsPage"));
const PoolDetailPage = lazy(() => import("./pages/PoolDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const RouteFallback = () => (
  <div className="loading-container" aria-busy="true" aria-live="polite">
    <div className="spinner" />
    <span className="sr-only">Loading page</span>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "in" | "out">("checking");

  const verify = useCallback(async () => {
    try {
      await adminVerifyApi();
      setStatus("in");
    } catch {
      setStatus("out");
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  /**
   * Re-verify when the tab regains focus.
   *
   * The check previously ran once per page load and cached the result, so an
   * expired cookie left the admin on a fully-rendered dashboard where every
   * request silently failed. Re-checking on focus catches expiry within
   * seconds of the admin returning to the tab.
   */
  useEffect(() => {
    const onFocus = () => void verify();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [verify]);

  // The interceptor calls this the moment any request 401s.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus("out"));
  }, []);

  if (status === "checking") {
    return (
      <div
        className="loading-container"
        style={{ height: "100vh" }}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="spinner" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  return status === "in" ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    // Outer boundary: if the router or layout itself throws, the admin still
    // gets a message and a reload action rather than a blank document.
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#1E293B",
              color: "#F8FAFC",
              fontSize: "14px",
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/*
              Inner boundary, inside Layout: a single page crashing leaves the
              sidebar navigable, so the admin can move to another section
              instead of being stuck.
            */}
            <Route
              path="/"
              element={
                <ErrorBoundary label="dashboard">
                  <Suspense fallback={<RouteFallback />}>
                    <DashboardPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/users"
              element={
                <ErrorBoundary label="user list">
                  <Suspense fallback={<RouteFallback />}>
                    <UsersPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ErrorBoundary label="user details">
                  <Suspense fallback={<RouteFallback />}>
                    <UserDetailPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/expenses"
              element={
                <ErrorBoundary label="expenses">
                  <Suspense fallback={<RouteFallback />}>
                    <ExpensesPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/pools"
              element={
                <ErrorBoundary label="pools">
                  <Suspense fallback={<RouteFallback />}>
                    <PoolsPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/pools/:id"
              element={
                <ErrorBoundary label="pool details">
                  <Suspense fallback={<RouteFallback />}>
                    <PoolDetailPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/notifications"
              element={
                <ErrorBoundary label="notifications">
                  <Suspense fallback={<RouteFallback />}>
                    <NotificationsPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            {/*
              A real 404. Every unknown URL previously redirected to the
              dashboard, so a mistyped or stale deep link gave no indication
              that the page did not exist.
            */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
