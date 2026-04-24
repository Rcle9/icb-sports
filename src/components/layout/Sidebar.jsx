import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOutUser } from "../../services/authService";

export default function Sidebar({ role = "user" }) {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(path) {
    return location.pathname === path;
  }

  function linkClass(path) {
    return `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
      isActive(path)
        ? "bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.30)] scale-[1.02]"
        : "text-slate-700 hover:bg-slate-100 hover:text-black hover:translate-x-1"
    }`;
  }

  async function handleLogout() {
    await signOutUser();
    navigate("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[320px] flex-col justify-between border-r border-slate-200 bg-white/90 px-5 py-6 shadow-[8px_0_30px_rgba(15,23,42,0.04)] backdrop-blur-xl md:flex">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)]">
            🏟️
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">InCredoBall</h1>
            <p className="text-xs text-black">Sports Management</p>
          </div>
        </div>

        {role === "user" && (
          <div className="space-y-2">
            <Link to="/dashboard" className={linkClass("/dashboard")}>
              📊 Dashboard
            </Link>
            <Link to="/booking" className={linkClass("/booking")}>
              📅 Booking
            </Link>
            <Link to="/coaching" className={linkClass("/coaching")}>
              🏸 Coaching
            </Link>
            <Link to="/shop" className={linkClass("/shop")}>
              🛒 Shop
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              ⚙️ Profile Settings
            </Link>
          </div>
        )}

        {role === "staff" && (
          <div className="space-y-2">
            <Link to="/staff" className={linkClass("/staff")}>
              📊 Dashboard
            </Link>
            <Link to="/staff/bookings" className={linkClass("/staff/bookings")}>
              📅 Bookings
            </Link>
            <Link to="/staff/coaching" className={linkClass("/staff/coaching")}>
              🏸 Coaching
            </Link>
            <Link
              to="/staff/inventory"
              className={linkClass("/staff/inventory")}
            >
              📦 Inventory
            </Link>
            <Link
              to="/staff/maintenance"
              className={linkClass("/staff/maintenance")}
            >
              🛠️ Maintenance
            </Link>
            <Link to="/staff/logs" className={linkClass("/staff/logs")}>
              🧾 Activity Logs
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              ⚙️ Profile Settings
            </Link>
          </div>
        )}

        {role === "admin" && (
          <div className="space-y-2">
            <Link to="/admin" className={linkClass("/admin")}>
              📊 System Overview
            </Link>
            <Link to="/admin/users" className={linkClass("/admin/users")}>
              👥 User Management
            </Link>
            <Link to="/admin/facility" className={linkClass("/admin/facility")}>
              🏟️ Facility Control
            </Link>
            <Link to="/admin/reports" className={linkClass("/admin/reports")}>
              📈 Reports
            </Link>
            <Link to="/admin/settings" className={linkClass("/admin/settings")}>
              ⚙️ Settings
            </Link>
            <Link
              to="/profile-settings"
              className={linkClass("/profile-settings")}
            >
              👤 Profile Settings
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-slate-900 p-4 text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)]">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100">
            Quick Access
          </p>
          <p className="mt-2 text-sm font-semibold">
            Manage sports operations with real-time tools and notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}