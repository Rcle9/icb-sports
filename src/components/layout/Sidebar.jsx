import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOutUser } from "../../services/authService";

export default function Sidebar({ role = "user" }) {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(path) {
    return location.pathname === path;
  }

  function linkClass(path) {
    const active = isActive(path);

    return `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
      active
        ? "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)]"
        : "text-black hover:bg-slate-100 hover:text-black"
    }`;
  }

  async function handleLogout() {
    try {
      await signOutUser();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  }

  return (
    <aside className="hidden md:flex w-72 min-h-screen flex-col justify-between border-r border-slate-200 bg-white px-5 py-6">
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)]">
              🏟️
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">InCredoBall</h1>
              <p className="text-xs text-black">Sports Management</p>
            </div>
          </div>
        </div>

        {role === "user" && (
          <div className="space-y-2">
            <Link to="/dashboard" className={linkClass("/dashboard")}>
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
            <Link to="/booking" className={linkClass("/booking")}>
              <span>📅</span>
              <span>Booking</span>
            </Link>
            <Link to="/coaching" className={linkClass("/coaching")}>
              <span>🏸</span>
              <span>Coaching</span>
            </Link>
            <Link to="/shop" className={linkClass("/shop")}>
              <span>🛒</span>
              <span>Shop</span>
            </Link>
            <Link to="/notifications" className={linkClass("/notifications")}>
              <span>🔔</span>
              <span>Notifications</span>
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              <span>⚙️</span>
              <span>Profile Settings</span>
            </Link>
          </div>
        )}

        {role === "staff" && (
          <div className="space-y-2">
            <Link to="/staff" className={linkClass("/staff")}>
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
            <Link to="/staff/bookings" className={linkClass("/staff/bookings")}>
              <span>📅</span>
              <span>Bookings</span>
            </Link>
            <Link to="/staff/coaching" className={linkClass("/staff/coaching")}>
              <span>🏸</span>
              <span>Coaching</span>
            </Link>
            <Link to="/staff/inventory" className={linkClass("/staff/inventory")}>
              <span>📦</span>
              <span>Inventory</span>
            </Link>
            <Link
              to="/staff/maintenance"
              className={linkClass("/staff/maintenance")}
            >
              <span>🛠️</span>
              <span>Maintenance</span>
            </Link>
            <Link to="/staff/logs" className={linkClass("/staff/logs")}>
              <span>🧾</span>
              <span>Activity Logs</span>
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              <span>⚙️</span>
              <span>Profile Settings</span>
            </Link>
          </div>
        )}

        {role === "admin" && (
          <div className="space-y-2">
            <Link to="/admin" className={linkClass("/admin")}>
              <span>📊</span>
              <span>System Overview</span>
            </Link>
            <Link to="/admin/users" className={linkClass("/admin/users")}>
              <span>👥</span>
              <span>User Management</span>
            </Link>
            <Link to="/admin/facility" className={linkClass("/admin/facility")}>
              <span>🏟️</span>
              <span>Facility Control</span>
            </Link>
            <Link to="/admin/reports" className={linkClass("/admin/reports")}>
              <span>📈</span>
              <span>Reports</span>
            </Link>
            <Link to="/admin/settings" className={linkClass("/admin/settings")}>
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              <span>👤</span>
              <span>Profile Settings</span>
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)]">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100">
            Quick Access
          </p>
          <p className="mt-2 text-sm font-semibold">
            Manage sports operations with real-time tools and notifications.
          </p>
        </div>

        <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Logout
          </button>

          <Link
            to="/help"
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-slate-100"
          >
            Help Center
          </Link>
        </div>
      </div>
    </aside>
  );
}