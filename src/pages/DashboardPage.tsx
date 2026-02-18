import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  Receipt,
  Wallet,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
} from "lucide-react";
import { getDashboardStatsApi } from "../api/adminApi";

const CHART_COLORS = [
  "#4F46E5",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await getDashboardStatsApi();
      setStats(res.data.stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "primary",
    },
    {
      label: "Total Expenses",
      value: `₹${stats.grandTotalExpense.toLocaleString()}`,
      icon: IndianRupee,
      color: "danger",
    },
    {
      label: "Active Pools",
      value: stats.totalPools.toLocaleString(),
      icon: Wallet,
      color: "success",
    },
    {
      label: "Transactions",
      value: stats.totalTransactions.toLocaleString(),
      icon: TrendingUp,
      color: "info",
    },
  ];

  // Radar data from categories
  const radarData =
    stats.categoryData?.slice(0, 6).map((c: any) => ({
      subject: c.name,
      value: c.count,
      fullMark: Math.max(...stats.categoryData.map((x: any) => x.count)),
    })) || [];

  return (
    <>
      <div className="page-header">
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Dashboard
        </motion.h1>
        <p className="page-subtitle">Welcome back, Admin</p>
      </div>

      <div className="page-content">
        {/* Stat Cards */}
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
                <div className="stat-change up">
                  <ArrowUpRight size={14} /> Active
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row 1: Area + Pie */}
        <motion.div
          className="charts-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Monthly Expense Trend — Area Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Monthly Expense Trend</h3>
              <span className="chart-badge">Last 12 months</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.monthlyExpenses}>
                <defs>
                  <linearGradient
                    id="expenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    `₹${value.toLocaleString()}`,
                    "Amount",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fill="url(#expenseGradient)"
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution — Pie Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Category Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {stats.categoryData?.map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    `₹${value.toLocaleString()}`,
                    "Amount",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Charts Row 2: Bar + Radar */}
        <motion.div
          className="charts-grid-equal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Daily Signups — Bar Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Daily User Signups</h3>
              <span className="chart-badge">Last 30 days</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#06B6D4"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Radar Chart */}
          {radarData.length > 0 && (
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Category Radar</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <PolarRadiusAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                  />
                  <Radar
                    name="Entries"
                    dataKey="value"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.25}
                    animationDuration={1500}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Recent Users */}
        <motion.div
          className="data-table-container"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="data-table-header">
            <h3 className="data-table-title">Recent Users</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers?.map((user: any) => (
                <tr key={user._id}>
                  <td>
                    <div className="table-user-cell">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="table-avatar"
                        />
                      ) : (
                        <div className="table-avatar-placeholder">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="table-user-name">{user.name}</div>
                    </div>
                  </td>
                  <td>{user.phone}</td>
                  <td>
                    <span className="badge primary">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </>
  );
}
