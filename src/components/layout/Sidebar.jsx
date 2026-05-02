import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const userLinks = [
  { label: "📊 Dashboard", path: "/dashboard" },
  { label: "🗓️ Booking", path: "/booking" },
  { label: "🏸 Coaching", path: "/coaching" },
  { label: "🛒 Shop", path: "/shop" },
  
  { label: "⚙️ Profile Settings", path: "/profile-settings" },
];

const staffLinks = [
  { label: "📊 Dashboard", path: "/staff" },
  { label: "🗓️ Bookings", path: "/staff/bookings" },
  { label: "🏸 Coaching", path: "/staff/coaching" },
  { label: "📦 Inventory", path: "/staff/inventory" },
  { label: "🛠️ Maintenance", path: "/staff/maintenance" },
  { label: "📋 Activity Logs", path: "/staff/logs" },
  
  { label: "⚙️ Profile Settings", path: "/profile-settings" },
];

const adminLinks = [
  { label: "📊 System Overview", path: "/admin" },
  { label: "👥 User Management", path: "/admin/users" },
  { label: "🏟️ Facility Control", path: "/admin/facility" },
  { label: "📈 Reports", path: "/admin/reports" },
  { label: "⚙️ Settings", path: "/admin/settings" },
  
  { label: "👤 Profile Settings", path: "/profile-settings" },
];

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const currentRole = role || profile?.role || "user";

  const links =
    currentRole === "admin"
      ? adminLinks
      : currentRole === "staff"
      ? staffLinks
      : userLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col justify-between border-r border-slate-200 bg-white px-5 py-6 shadow-sm"
      style={{ width: "320px" }}
    >
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-lg">
            🏟️
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-950">InCredoBall</h1>
            <p className="text-xs font-medium text-slate-600">
              Sports Management
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {links.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/staff" || item.path === "/admin" || item.path === "/dashboard"}
              className={({ isActive }) =>
                `block rounded-2xl px-5 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)]"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            Quick Access
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            Manage sports operations with real-time tools and notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}