import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  Box,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { useSidebar } from "../../context/SidebarContext";
import logo from "../../assets/ICBLOGO.jpg";

const roleLabels = {
  user: "Customer Portal",
  staff: "Staff Workspace",
  admin: "Admin Control",
};

const menus = {
  user: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Facility Booking", path: "/booking", icon: CalendarDays },
    { label: "My Bookings", path: "/my-bookings", icon: CalendarCheck },
    { label: "Booking Timeline", path: "/booking-timeline", icon: CalendarClock },
    { label: "Notifications", path: "/user/notifications", icon: Bell },
    { label: "Profile Settings", path: "/user/profile", icon: User },
  ],

  staff: [
    { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Operations Board", path: "/staff/operations", icon: CalendarCheck },
    {
      label: "Availability Board",
      path: "/staff/availability-board",
      icon: CalendarClock,
    },
    {
      label: "Manage Bookings",
      path: "/staff/manage-bookings",
      icon: ClipboardList,
    },
    { label: "Walk-in Booking", path: "/staff/walk-in-booking", icon: CalendarDays },
    { label: "Inventory", path: "/staff/inventory", icon: Box },
    { label: "Maintenance", path: "/staff/maintenance", icon: Wrench },
    { label: "Activity Logs", path: "/staff/activity-logs", icon: Activity },
    { label: "Notifications", path: "/staff/notifications", icon: Bell },
    { label: "Profile Settings", path: "/staff/profile", icon: User },
  ],

  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Command Center", path: "/admin/command-center", icon: ShieldCheck },
    { label: "Operations Board", path: "/admin/operations", icon: CalendarCheck },
    {
      label: "Availability Board",
      path: "/admin/availability-board",
      icon: CalendarClock,
    },
    { label: "Facility Management", path: "/admin/facilities", icon: Home },
    { label: "User Management", path: "/admin/users", icon: Users },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Activity Logs", path: "/admin/activity-logs", icon: Activity },
    { label: "Notifications", path: "/admin/notifications", icon: Bell },
    { label: "Payment Settings", path: "/admin/payment-settings", icon: Package },
    { label: "Settings", path: "/admin/settings", icon: Settings },
    { label: "Profile Settings", path: "/admin/profile", icon: User },
  ],
};

function getHomePath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";
  return "/dashboard";
}

export default function Sidebar({ role = "user" }) {
  const navigate = useNavigate();
  const { mobileSidebarOpen, closeSidebar } = useSidebar();

  const normalizedRole = ["user", "staff", "admin"].includes(role)
    ? role
    : "user";

  const menuItems = menus[normalizedRole] || menus.user;

  async function handleLogout() {
    await supabase.auth.signOut();
    closeSidebar();
    navigate("/login", { replace: true });
  }

  function handleLogoClick() {
    navigate(getHomePath(normalizedRole));
    closeSidebar();
  }

  return (
    <>
      {mobileSidebarOpen && (
        <button
          type="button"
          onClick={closeSidebar}
          className="fixed inset-0 z-[80] bg-[#0B1F33]/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[90] flex h-screen w-[280px] max-w-[86vw] flex-col border-r border-white/10 bg-[#0B1F33] text-white shadow-2xl transition-transform duration-300 lg:z-40 lg:translate-x-0 lg:shadow-none ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-white/10 px-5 py-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#C97B6C]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogoClick}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white p-1 shadow-sm">
                <img
                  src={logo}
                  alt="InCredoBall Logo"
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-[#E8A093]">
                  InCredoBall
                </p>

                <h1 className="truncate text-lg font-black leading-tight text-white">
                  Sports Center
                </h1>

                <p className="mt-0.5 truncate text-xs font-bold text-white/55">
                  {roleLabels[normalizedRole] || "User Panel"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={closeSidebar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    isActive
                      ? "bg-[#C97B6C] text-white shadow-[0_10px_24px_rgba(201,123,108,0.28)]"
                      : "text-white/65 hover:bg-white/8 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isActive
                          ? "bg-white/18 text-white"
                          : "bg-white/5 text-white/65 group-hover:bg-white/10 group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
              Session
            </p>
            <p className="mt-1 text-sm font-bold text-white/70">
              {roleLabels[normalizedRole] || "User Panel"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm font-black text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658]"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}