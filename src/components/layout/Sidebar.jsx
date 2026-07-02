import { createElement, isValidElement } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  FileBarChart,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Store,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";

const sidebarBase =
  "fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-[#DED8D2] bg-white shadow-sm";

const linkBase =
  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition";

const activeLink = "bg-[#C97B6C] text-white shadow-sm";
const inactiveLink = "text-slate-600 hover:bg-[#F5F3F1] hover:text-[#2B2B2B]";

function renderIcon(icon) {
  if (!icon) {
    return <span className="h-[18px] w-[18px]" />;
  }

  if (isValidElement(icon)) {
    return icon;
  }

  if (typeof icon === "function") {
    return createElement(icon, {
      size: 18,
      strokeWidth: 2,
    });
  }

  if (
    typeof icon === "object" &&
    icon !== null &&
    icon.$$typeof &&
    icon.render
  ) {
    return createElement(icon, {
      size: 18,
      strokeWidth: 2,
    });
  }

  return <span className="h-[18px] w-[18px]" />;
}

const userMenu = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Facility Booking",
    path: "/booking",
    icon: Calendar,
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
    icon: User,
  },
];

const staffMenu = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Operations Board",
    path: "/staff/operations-board",
    icon: CalendarCheck,
  },
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
  {
    label: "Walk-in Booking",
    path: "/staff/walk-in-booking",
    icon: CalendarPlus,
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
    icon: User,
  },
];

const adminMenu = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Command Center",
    path: "/admin/command-center",
    icon: ShieldCheck,
  },
  {
    label: "Operations Board",
    path: "/staff/operations-board",
    icon: CalendarCheck,
  },
  {
    label: "Availability Board",
    path: "/staff/availability-board",
    icon: CalendarClock,
  },
  {
    label: "Facility Management",
    path: "/admin/facilities",
    icon: Store,
  },
  {
    label: "User Management",
    path: "/admin/users",
    icon: Users,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: FileBarChart,
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
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
  {
    label: "Profile Settings",
    path: "/profile-settings",
    icon: User,
  },
];

function getMenuByRole(role) {
  const currentRole = String(role || "user").toLowerCase();

  if (currentRole === "admin") return adminMenu;
  if (currentRole === "staff") return staffMenu;

  return userMenu;
}

function getRoleLabel(role) {
  const currentRole = String(role || "user").toLowerCase();

  if (currentRole === "admin") return "Administrator";
  if (currentRole === "staff") return "Staff";

  return "User";
}

function getRoleHome(role) {
  const currentRole = String(role || "user").toLowerCase();

  if (currentRole === "admin") return "/admin/dashboard";
  if (currentRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

export default function Sidebar({ role = "user", isOpen = true, onClose }) {
  const navigate = useNavigate();
  const menuItems = getMenuByRole(role);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`${sidebarBase} ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-[#DED8D2] px-5 py-5">
          <button
            type="button"
            onClick={() => navigate(getRoleHome(role))}
            className="text-left"
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#C97B6C]">
              InCredoBall
            </p>

            <h1 className="mt-1 text-xl font-black text-[#2B2B2B]">
              Sports Center
            </h1>

            <p className="mt-1 text-xs font-bold text-slate-500">
              {getRoleLabel(role)} Panel
            </p>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#DED8D2] p-2 text-[#2B2B2B] hover:bg-[#F5F3F1] lg:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={`${item.label}-${item.path}`}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? activeLink : inactiveLink}`
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {renderIcon(item.icon)}
                </span>

                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-[#DED8D2] p-4">
            

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#2B2B2B] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#C97B6C]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <LogOut size={18} />
            </span>

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}