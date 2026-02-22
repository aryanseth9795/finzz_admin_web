import axios from "axios";

const API_BASE = "https://finzz-backend.onrender.com/api/v1/admin";
// const API_BASE = "http://localhost:3000/api/v1/admin";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Auth
export const adminLoginApi = (secretKey: string) =>
  api.post("/login", { secretKey });

export const adminLogoutApi = () => api.get("/logout");

export const adminVerifyApi = () => api.get("/verify");

// Dashboard
export const getDashboardStatsApi = () => api.get("/dashboard");

// Users
export const getAllUsersApi = (params: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}) => api.get("/users", { params });

export const getUserDetailApi = (id: string) => api.get(`/users/${id}`);

export const deleteUserApi = (id: string) => api.delete(`/users/${id}`);

// Expenses
export const getAllExpensesApi = (params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) => api.get("/expenses", { params });

// Pools
export const getAllPoolsApi = (params: { page?: number; limit?: number }) =>
  api.get("/pools", { params });

export const getPoolDashboardStatsApi = () => api.get("/pools/dashboard");

export const getAdminPoolDetailApi = (id: string) => api.get(`/pools/${id}`);

// Notifications
export const sendBulkNotificationApi = (title: string, body: string) =>
  api.post("/notifications/bulk", { title, body });

export const sendTargetedNotificationApi = (
  userIds: string[],
  title: string,
  body: string,
) => api.post("/notifications/targeted", { userIds, title, body });

export default api;
