import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Bell,
  LogOut,
} from "lucide-react";
import { adminLogoutApi } from "../api/adminApi";
import toast from "react-hot-toast";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/pools", icon: Wallet, label: "Pools" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await adminLogoutApi();
      toast.success("Logged out");
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Finzz</div>
        <div className="sidebar-subtitle">Admin Panel</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-link" onClick={handleLogout}>
          <LogOut />
          Logout
        </button>
      </div>
    </aside>
  );
}
