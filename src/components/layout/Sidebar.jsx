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
  UserCog,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { useSidebar } from "../../context/SidebarContext";
import logo from "../../assets/ICBLOGO.jpg";

const USER_LINKS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Facility Booking",
    path: "/booking",
    icon: CalendarDays,
  },
  {
    label: "My Bookings",
    path: "/my-bookings",
    icon: CalendarCheck,
  },
  {
    label: "Booking Timeline",
    path: "/booking-timeline",
    icon: CalendarClock,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile Settings",
    path: "/profile-settings",
    icon: UserRound,
  },
];

const STAFF_LINKS = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: LayoutDashboard,
  },
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
  {
    label: "Inventory",
    path: "/staff/inventory",
    icon: Package,
  },
  {
    label: "Maintenance",
    path: "/staff/maintenance",
    icon: Wrench,
  },
  {
    label: "Activity Logs",
    path: "/staff/activity-logs",
    icon: Activity,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile Settings",
    path: "/profile-settings",
    icon: UserRound,
  },
];

const ADMIN_LINKS = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Command Center",
    path: "/admin/command-center",
    icon: Gauge,
  },
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
    label: "Facility Management",
    path: "/admin/facilities",
    icon: ShieldCheck,
  },
  {
    label: "User Management",
    path: "/admin/users",
    icon: Users,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "Activity Logs",
    path: "/admin/activity-logs",
    icon: Activity,
  },
  {
    label: "Payment Settings",
    path: "/admin/payment-settings",
    icon: CreditCard,
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile Settings",
    path: "/profile-settings",
    icon: UserRound,
  },
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
  if (normalizedRole === "staff") return "Staff Portal";

  return "Customer Portal";
}

function getRoleHome(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

export default function Sidebar({ role = "user" }) {
  const navigate = useNavigate();
  const { mobileSidebarOpen, closeSidebar } = useSidebar();

  const normalizedRole = normalizeRole(role);
  const links = getRoleLinks(normalizedRole);

  async function handleLogout() {
    try {
      closeSidebar?.();
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
            display: flex;
          }

          @media (max-width: 1023px) {
            .page-shell {
              display: block;
            }
          }
        `}
      </style>

      <aside className="hidden min-h-screen w-[288px] shrink-0 border-r border-white/10 bg-[#0B1F33] text-white lg:flex lg:flex-col">
        <SidebarContent
          role={normalizedRole}
          links={links}
          onLogout={handleLogout}
          onClose={closeSidebar}
          isMobile={false}
        />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[900] lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={closeSidebar}
            className="absolute inset-0 bg-[#0B1F33]/60 backdrop-blur-sm"
          />

          <aside className="relative z-[901] flex h-full w-[86%] max-w-[320px] flex-col bg-[#0B1F33] text-white shadow-2xl">
            <SidebarContent
              role={normalizedRole}
              links={links}
              onLogout={handleLogout}
              onClose={closeSidebar}
              isMobile
            />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ role, links, onLogout, onClose, isMobile }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/10 px-6 py-6">
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
                className="h-full w-full object-cover"
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="panel-scroll flex-1 space-y-2 px-4 py-6">
        {links.map((item) => (
          <SidebarItem
            key={`${item.path}-${item.label}`}
            item={item}
            onClick={onClose}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
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
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658]"
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
        `group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
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