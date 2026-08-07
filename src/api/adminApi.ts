import axios, { AxiosError } from "axios";

/**
 * API base URL.
 *
 * Was hardcoded to production with a commented-out localhost line, and
 * `import.meta.env` was not referenced anywhere in the repo despite Vite being
 * the bundler. So every local development session pointed at the production
 * database: testing the delete button deleted a real user, and testing the
 * notification form pushed to every real device.
 *
 * The default is now localhost, so the UNCONFIGURED state is the safe one.
 * Production supplies `VITE_API_BASE` at build time. See `.env.example`.
 */
const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://localhost:3000/api/v1/admin";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
});

/** Called when the server tells us the session is no longer valid. */
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

/**
 * Detect an expired session on ANY request.
 *
 * There was no response interceptor at all, and `ProtectedRoute` checked
 * authentication exactly once per page load and cached the boolean. So when
 * the cookie lapsed mid-session the admin stayed on a fully-rendered dashboard
 * while every request 401'd — surfacing as a red toast, a silent console
 * error, or a blank page depending on the screen, but never as "your session
 * expired". Nothing redirected to /login until a manual reload.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const isLoginAttempt = error.config?.url?.includes("/login");

    if ((status === 401 || status === 403) && !isLoginAttempt) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/**
 * A human-readable message for a failed request.
 *
 * Every page hand-rolled `error.response?.data?.message || "Failed to …"`,
 * which collapsed a timeout, an offline browser and a server fault into one
 * unhelpful string — when it surfaced at all.
 */
export const describeError = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError?.response) {
    if (axiosError.response.status === 401) {
      return "Your session expired. Please sign in again.";
    }
    return (
      axiosError.response.data?.message ??
      `Request failed (${axiosError.response.status})`
    );
  }
  if (axiosError?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }
  if (axiosError?.request) {
    return "Could not reach the server. Check your connection.";
  }
  return "Something went wrong. Please try again.";
};

// ── Types ────────────────────────────────────────────────────────────────
//
// The repo had no interface describing an API response anywhere: every page
// used `useState<any>`. That is why `getUserDetail`'s always-empty `pools`
// array and the dashboard's unguarded field access both went unnoticed.

export interface AdminUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  emailVerified?: boolean;
  friends?: string[];
  pushTokens?: string[];
  pushToken?: string;
  createdAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalPools: number;
  totalTransactions: number;
  grandTotalExpense: number;
  monthlyExpenses?: { month: string; total: number }[];
  categoryData?: { name: string; value: number; count: number }[];
  dailySignups?: { date: string; count: number }[];
  recentUsers?: AdminUser[];
}

export interface AdminExpense {
  _id: string;
  amount: number;
  date: string;
  remarks?: string;
  category?: string;
  type?: "debit" | "credit";
  /**
   * Populated by the server — but declared as a union because a reference can
   * also arrive as a bare id, and (per the delete-cascade findings) can be
   * `null` when the referenced user was removed.
   */
  userId?: AdminUser | string | null;
}

/**
 * Narrow a reference that may be a populated object, a bare id, or null.
 *
 * The same class of bug as the mobile client's reversed transaction
 * direction: code assumed a populated shape and read `.name` off whatever
 * arrived. Declaring the union forces the decision at each use site.
 */
export const populatedUser = (
  ref: AdminUser | string | null | undefined,
): AdminUser | null =>
  ref && typeof ref === "object" && "_id" in ref ? ref : null;

export interface ExpenseTotals {
  totalAmount: number;
  count: number;
  byCategory?: { name: string; total: number; count: number }[];
}

// ── Auth ─────────────────────────────────────────────────────────────────
export const adminLoginApi = (secretKey: string) =>
  api.post("/login", { secretKey });

/** POST, not GET: logging out changes state, and a GET is CSRF-reachable. */
export const adminLogoutApi = () => api.post("/logout");

export const adminVerifyApi = () => api.get("/verify");

// ── Dashboard ────────────────────────────────────────────────────────────
export const getDashboardStatsApi = () =>
  api.get<{ success: boolean; stats: DashboardStats }>("/dashboard");

// ── Users ────────────────────────────────────────────────────────────────
export const getAllUsersApi = (params: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}) =>
  api.get<{ success: boolean; users: AdminUser[]; pagination: Pagination }>(
    "/users",
    { params },
  );

export interface AdminLedger {
  _id: string;
  year: number;
  month: number;
  status: "open" | "closed";
  totalExpenses?: number;
  totalCredits?: number;
}

export interface AdminPoolSummary {
  _id: string;
  name: string;
  status?: "active" | "closed";
  members?: string[];
  admin?: string;
}

export interface UserDetailResponse {
  success: boolean;
  /**
   * `friends` is POPULATED here but a bare id array on the list endpoint, so
   * the base type must be omitted rather than intersected — `string[] &
   * AdminUser[]` is unsatisfiable.
   *
   * The array elements are nullable because `populate` resolves a deleted
   * user to `null`. The delete cascade is fixed, but corrupt rows already
   * exist, so the type keeps the possibility visible.
   */
  user: Omit<AdminUser, "friends"> & { friends?: (AdminUser | null)[] };
  expenseSummary: { totalAmount: number; count: number };
  /**
   * Was always `[]` because the server queried `createdBy` and
   * `members.userId`, neither of which exists on the Pool schema — so the
   * "Pools" card reported 0 even for pool administrators. Fixed server-side
   * in Phase 4A; typed here so a future shape change is a compile error.
   */
  pools: AdminPoolSummary[];
  ledgers: AdminLedger[];
}

export const getUserDetailApi = (id: string) =>
  api.get<UserDetailResponse>(`/users/${id}`);

export const deleteUserApi = (id: string) => api.delete(`/users/${id}`);

// ── Expenses ─────────────────────────────────────────────────────────────
export const getAllExpensesApi = (params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) =>
  api.get<{
    success: boolean;
    expenses: AdminExpense[];
    pagination: Pagination;
    totals?: ExpenseTotals;
  }>("/expenses", { params });

// ── Pools ────────────────────────────────────────────────────────────────
export const getAllPoolsApi = (params: { page?: number; limit?: number }) =>
  api.get("/pools", { params });

export const getPoolDashboardStatsApi = () => api.get("/pools/dashboard");

export const getAdminPoolDetailApi = (id: string) => api.get(`/pools/${id}`);

// ── Notifications ────────────────────────────────────────────────────────
export interface DeliveryResult {
  success: boolean;
  message: string;
  /** Devices Expo accepted. */
  accepted?: number;
  /** Devices Expo rejected (dead token, oversized payload…). */
  rejected?: number;
  /** Selected users that had no push token at all. */
  skipped?: number;
  recipients?: number;
  totalSelectedUsers?: number;
  /** @deprecated server alias for `accepted`, kept for older builds. */
  sentCount?: number;
}

export const sendBulkNotificationApi = (title: string, body: string) =>
  api.post<DeliveryResult>("/notifications/bulk", { title, body });

export const sendTargetedNotificationApi = (
  userIds: string[],
  title: string,
  body: string,
) =>
  api.post<DeliveryResult>("/notifications/targeted", { userIds, title, body });

export default api;
