import { NavLink } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Home,
  User,
} from "lucide-react";

const navItems = {
  user: [
    {
      label: "Home",
      path: "/dashboard",
      icon: Home,
    },
    {
      label: "Book",
      path: "/booking",
      icon: CalendarDays,
    },
    {
      label: "Bookings",
      path: "/my-bookings",
      icon: CalendarCheck,
    },
    {
      label: "Alerts",
      path: "/notifications",
      icon: Bell,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ],

  staff: [
    {
      label: "Home",
      path: "/staff/dashboard",
      icon: Home,
    },
    {
      label: "Manage",
      path: "/staff/manage-bookings",
      icon: ClipboardList,
    },
    {
      label: "Walk-in",
      path: "/staff/walk-in-booking",
      icon: CalendarDays,
    },
    {
      label: "Alerts",
      path: "/staff/notifications",
      icon: Bell,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ],

  admin: [
    {
      label: "Home",
      path: "/admin/dashboard",
      icon: Home,
    },
    {
      label: "Facility",
      path: "/admin/facilities",
      icon: CalendarDays,
    },
    {
      label: "Bookings",
      path: "/admin/availability-board",
      icon: CalendarCheck,
    },
    {
      label: "Alerts",
      path: "/admin/notifications",
      icon: Bell,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ],
};

export default function MobileBottomNav({ role = "user" }) {
  const items = navItems[role] || navItems.user;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[#DED8D2] bg-white px-2 pb-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                  isActive
                    ? "bg-[#F3E4DF] text-[#C97B6C]"
                    : "text-slate-500 hover:bg-[#F5F3F1] hover:text-[#C97B6C]"
                }`
              }
            >
              <Icon size={20} />
              <span className="mt-1 truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}