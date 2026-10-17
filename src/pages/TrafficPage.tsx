import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Activity,
  DoorOpen,
  Server,
  CalendarDays,
  CalendarRange,
  Repeat,
} from "lucide-react";
import {
  getTrafficAnalyticsApi,
  describeError,
  type TrafficAnalytics,
} from "../api/adminApi";
import {
  RANGE_OPTIONS,
  pct,
  deltaVsYesterday,
  shortDate,
  compactNumber,
  relativeTime,
} from "./traffic";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const tooltipStyle = {
  borderRadius: 10,
  border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const axisTick = { fontSize: 12, fill: "#94A3B8" };

const count = (n: number | undefined | null): number =>
  Number.isFinite(Number(n)) ? Number(n) : 0;

export default function TrafficPage() {
  const [range, setRange] = useState<number>(30);
  const [data, setData] = useState<TrafficAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may write state (fast range switching).
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getTrafficAnalyticsApi(range);
      if (id !== requestId.current) return;
      setData(res.data);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(describeError(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    if (loading) {
      return (
        <div className="loading-container" aria-busy="true">
          <div className="spinner" />
          <span className="sr-only">Loading traffic</span>
        </div>
      );
    }
    return (
      <div className="error-state" role="alert">
        <h2 className="error-state-title">Could not load traffic</h2>
        <p className="error-state-message">
          {error ?? "The server returned no data."}
        </p>
        <div className="error-state-actions">
          <button className="btn btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const today = data.today ?? { activeUsers: 0, opens: 0, requests: 0, newUsers: 0 };
  const totals = data.totals ?? { dau: 0, wau: 0, mau: 0, stickiness: 0 };
  const days = data.days ?? [];
  const topToday = data.topToday ?? [];
  const delta = deltaVsYesterday(days);
  const now = new Date();

  const statCards = [
    {
      label: "Active today",
      value: count(today.activeUsers).toLocaleString("en-IN"),
      sub: delta?.label,
      icon: Activity,
      color: "primary",
    },
    {
      label: "Opens today",
      value: count(today.opens).toLocaleString("en-IN"),
      icon: DoorOpen,
      color: "info",
    },
    {
      label: "Requests today",
      value: compactNumber(count(today.requests)),
      icon: Server,
      color: "success",
    },
    {
      label: "Active · 7 days",
      value: count(totals.wau).toLocaleString("en-IN"),
      icon: CalendarDays,
      color: "warning",
    },
    {
      label: "Active · 30 days",
      value: count(totals.mau).toLocaleString("en-IN"),
      icon: CalendarRange,
      color: "danger",
    },
    {
      label: "Stickiness",
      value: pct(count(totals.stickiness)),
      sub: "daily / monthly actives",
      icon: Repeat,
      color: "primary",
    },
  ];

  return (
    <>
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <motion.h1
            className="page-title"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Traffic
          </motion.h1>
          <p className="page-subtitle">Who's using Finzz, day by day</p>
        </div>
        <div role="group" aria-label="Date range" style={{ display: "flex", gap: 8 }}>
          {RANGE_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`btn ${range === d ? "btn-primary" : "btn-outline"}`}
              aria-pressed={range === d}
              onClick={() => setRange(d)}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div
        className="page-content"
        aria-busy={loading}
        style={loading ? { opacity: 0.6, transition: "opacity 0.2s" } : undefined}
      >
        {error && (
          <div className="error-state" role="alert" style={{ marginBottom: 20 }}>
            <p className="error-state-message">{error}</p>
            <div className="error-state-actions">
              <button className="btn btn-primary" onClick={load}>
                Retry
              </button>
            </div>
          </div>
        )}

        <motion.div
          className="stats-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              className={`stat-card ${card.color}`}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className={`stat-icon ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-label">{card.label}</div>
                <div className="stat-value">{card.value}</div>
                {card.sub && (
                  <div className="stat-label" style={{ marginTop: 2 }}>
                    {card.sub}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="charts-grid-equal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Active users &amp; opens</h3>
              <span className="chart-badge">Last {range} days</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="trafficActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trafficOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ ...axisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={shortDate}
                  minTickGap={16}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => shortDate(String(v))}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active users"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fill="url(#trafficActive)"
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="opens"
                  name="Opens"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  fill="url(#trafficOpens)"
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Requests per day</h3>
              <span className="chart-badge">Last {range} days</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ ...axisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={shortDate}
                  minTickGap={16}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tickFormatter={(v) => compactNumber(Number(v))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => shortDate(String(v))}
                />
                <Bar
                  dataKey="requests"
                  name="Requests"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="data-table-container"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="data-table-header">
            <h3 className="data-table-title">Most active today</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Requests</th>
                <th>Opens</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {topToday.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No activity yet today
                  </td>
                </tr>
              ) : (
                topToday.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      <div className="table-user-cell">
                        <div className="table-avatar-placeholder">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="table-user-name">{u.name}</div>
                      </div>
                    </td>
                    <td>{count(u.requests).toLocaleString("en-IN")}</td>
                    <td>{count(u.opens).toLocaleString("en-IN")}</td>
                    <td>{relativeTime(u.lastSeenAt, now)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </>
  );
}
