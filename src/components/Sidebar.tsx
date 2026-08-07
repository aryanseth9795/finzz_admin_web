import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Bell,
  LogOut,
} from "lucide-react";
import { adminLogoutApi, describeError } from "../api/adminApi";
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

  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Logging out must actually end the server session.
   *
   * The previous `catch { navigate("/login") }` navigated away regardless — so
   * a failed request left the admin looking signed out while the `admin-token`
   * cookie was still valid. On a shared machine the next person reached the
   * dashboard by typing `/`.
   *
   * The session now ends on the server or the user is told it did not.
   */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await adminLogoutApi();
      toast.success("Signed out");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        `Could not sign out: ${describeError(error)} — your session may still be active.`,
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
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
        <button
          className="nav-link"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut aria-hidden="true" />
          {loggingOut ? "Signing out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
