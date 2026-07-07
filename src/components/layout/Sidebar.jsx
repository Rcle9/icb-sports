// src/components/layout/Sidebar.jsx

import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Package,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { useSidebar } from "../../context/SidebarContext";
import logo from "../../assets/ICBLOGO.jpg";

const USER_LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Facility Booking", path: "/booking", icon: CalendarDays },
  { label: "My Bookings", path: "/my-bookings", icon: CalendarCheck },
  { label: "Booking Timeline", path: "/booking-timeline", icon: CalendarClock },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile Settings", path: "/user/profile", icon: UserRound },
];

const STAFF_LINKS = [
  { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
  {
    label: "Operations Board",
    path: "/staff/operations-board",
    icon: MenuSquare,
  },
  {
    label: "Availability Board",
    path: "/staff/availability-board",
    icon: CalendarDays,
  },
  {
    label: "Manage Bookings",
    path: "/staff/manage-bookings",
    icon: CalendarCheck,
  },
  {
    label: "Walk-in Booking",
    path: "/staff/walk-in-booking",
    icon: CalendarClock,
  },
  { label: "Inventory", path: "/staff/inventory", icon: Package },
  { label: "Maintenance", path: "/staff/maintenance", icon: Wrench },
  { label: "Activity Logs", path: "/staff/activity-logs", icon: Activity },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile Settings", path: "/staff/profile", icon: UserRound },
];

const ADMIN_LINKS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Command Center", path: "/admin/command-center", icon: Gauge },
  {
    label: "Operations Board",
    path: "/staff/operations-board",
    icon: MenuSquare,
  },
  {
    label: "Availability Board",
    path: "/staff/availability-board",
    icon: CalendarDays,
  },
  {
  label: "Manage Bookings",
  path: "/admin/manage-bookings",
  icon: CalendarCheck,
},
  { label: "Facility Management", path: "/admin/facilities", icon: ShieldCheck },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Reports", path: "/admin/reports", icon: BarChart3 },
  { label: "Activity Logs", path: "/admin/activity-logs", icon: Activity },
  { label: "Payment Settings", path: "/admin/payment-settings", icon: CreditCard },
  {
  label: "Manage Bookings",
  path: "/admin/manage-bookings",
  icon: CalendarCheck,
},
  { label: "Settings", path: "/admin/settings", icon: Settings },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile Settings", path: "/admin/profile", icon: UserRound },
];

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function getRoleLinks(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return ADMIN_LINKS;
  if (normalizedRole === "staff") return STAFF_LINKS;

  return USER_LINKS;
}

function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "Admin Portal";
  if (normalizedRole === "staff") return "Staff Portal";

  return "Customer Portal";
}

function getSessionLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "Administrator";
  if (normalizedRole === "staff") return "Staff Account";

  return "Customer Account";
}

function getRoleHome(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

export default function Sidebar({
  role = "user",
  sidebarOpen,
  isOpen,
  open,
  onClose,
  setSidebarOpen,
}) {
  const navigate = useNavigate();
  const sidebarContext = useSidebar();

  const normalizedRole = normalizeRole(role);
  const links = getRoleLinks(normalizedRole);

  const controlledOpen =
    typeof sidebarOpen === "boolean"
      ? sidebarOpen
      : typeof isOpen === "boolean"
      ? isOpen
      : typeof open === "boolean"
      ? open
      : null;

  const mobileOpen =
    controlledOpen !== null
      ? controlledOpen
      : Boolean(sidebarContext?.mobileSidebarOpen);

  function closeMobileSidebar() {
    if (typeof onClose === "function") {
      onClose();
    }

    if (typeof setSidebarOpen === "function") {
      setSidebarOpen(false);
    }

    if (typeof sidebarContext?.closeSidebar === "function") {
      sidebarContext.closeSidebar();
    }
  }

  async function handleLogout() {
    try {
      closeMobileSidebar();
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error.message);
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <style>
        {`
          .page-shell {
            display: flex !important;
            width: 100%;
            min-height: 100vh;
            background: #F5F3F1;
          }

          .page-main {
            min-width: 0;
            flex: 1;
            width: 100%;
            min-height: 100vh;
          }

          @media (max-width: 1023px) {
            .page-shell {
              display: block !important;
            }

            .page-main {
              width: 100%;
            }
          }

          .icb-sidebar-scroll {
            scrollbar-width: none;
          }

          .icb-sidebar-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <aside
        className="sticky top-0 hidden h-screen w-[288px] shrink-0 overflow-hidden border-r border-white/10 text-white lg:flex lg:flex-col"
        style={{
          backgroundColor: "#0B1F33",
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(201,123,108,0.22), transparent 30%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.08), transparent 28%)",
        }}
      >
        <SidebarContent
          role={normalizedRole}
          links={links}
          onLogout={handleLogout}
          onClose={closeMobileSidebar}
          isMobile={false}
        />
      </aside>

      <div
        className={`fixed inset-0 z-[9999] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible"
        }`}
      >
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={closeMobileSidebar}
          className={`absolute inset-0 bg-[#0B1F33]/70 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`relative z-[10000] flex h-full w-[88%] max-w-[330px] flex-col overflow-hidden text-white shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            backgroundColor: "#0B1F33",
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(201,123,108,0.22), transparent 30%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.08), transparent 28%)",
          }}
        >
          <SidebarContent
            role={normalizedRole}
            links={links}
            onLogout={handleLogout}
            onClose={closeMobileSidebar}
            isMobile
          />
        </aside>
      </div>
    </>
  );
}

function SidebarContent({ role, links, onLogout, onClose, isMobile }) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full border-[30px] border-white/5" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full border-[34px] border-white/5" />

      <div className="relative z-10 shrink-0 border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <NavLink
            to={getRoleHome(role)}
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-white/20">
              <img
                src={logo}
                alt="InCredoBall"
                className="h-14 w-14 object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-[#E8A093]">
                InCredoBall
              </p>

              <h1 className="truncate text-lg font-black leading-tight text-white">
                Sports Center
              </h1>

              <p className="truncate text-xs font-bold text-slate-300">
                {getRoleLabel(role)}
              </p>
            </div>
          </NavLink>

          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition active:scale-95 hover:bg-white/15"
              aria-label="Close menu"
            >
              <X size={21} />
            </button>
          )}
        </div>
      </div>

      <nav className="icb-sidebar-scroll relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {links.map((item) => (
          <SidebarItem
            key={`${item.path}-${item.label}`}
            item={item}
            onClick={onClose}
          />
        ))}
      </nav>

      <div className="relative z-10 shrink-0 border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E8A093]">
            Session
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {getSessionLabel(role)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0B1F33] transition active:scale-[0.98] hover:bg-[#F3E4DF] hover:text-[#B86658]"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

function SidebarItem({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
          isActive
            ? "bg-[#C97B6C] text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)]"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
              isActive
                ? "bg-white/15 text-white"
                : "bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
            }`}
          >
            <Icon size={19} />
          </span>

          <span className="min-w-0 flex-1 truncate">{item.label}</span>

          {isActive && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
          )}
        </>
      )}
    </NavLink>
  );
}