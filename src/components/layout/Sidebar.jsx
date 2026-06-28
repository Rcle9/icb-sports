import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  Wrench,
  ClipboardList,
  Settings,
  Boxes,
  UserRound,
} from "lucide-react";

import { supabase } from "../../services/supabaseClient";
import logo from "../../assets/logo.jpg";

export default function Sidebar({ role = "user" }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
    window.location.reload();
  }

  const coachLinks = [
  {
    name: "Dashboard",
    path: "/coach",
    icon: <LayoutDashboard size={18} />,
  },
  {
    name: "Booking",
    path: "/booking",
    icon: <CalendarDays size={18} />,
  },
];

  const staffLinks = [
    { name: "Dashboard", path: "/staff", icon: <LayoutDashboard size={18} /> },
    { name: "Bookings", path: "/staff/bookings", icon: <CalendarDays size={18} /> },
    { name: "Inventory", path: "/staff/inventory", icon: <Boxes size={18} /> },
    { name: "Maintenance", path: "/staff/maintenance", icon: <Wrench size={18} /> },
    { name: "Activity Logs", path: "/staff/activity-logs", icon: <ClipboardList size={18} /> },
    { name: "Profile Settings", path: "/staff/profile", icon: <Settings size={18} /> },
  ];

  const userLinks = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Booking", path: "/booking", icon: <CalendarDays size={18} /> },
    { name: "My Bookings", path: "/coaching", icon: <Dumbbell size={18} /> },
    { name: "Profile Settings", path: "/profile", icon: <Settings size={18} /> },
  ];

  const adminLinks = [
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard size={18} /> },
    { name: "Facilities", path: "/admin/facilities", icon: <CalendarDays size={18} /> },
    { name: "Users", path: "/admin/users", icon: <UserRound size={18} /> },
    { name: "Reports", path: "/admin/reports", icon: <ClipboardList size={18} /> },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  let links = userLinks;
  if (role === "staff") links = staffLinks;
  if (role === "admin") links = adminLinks;
  if (role === "coach") links = coachLinks;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-[#DED8D2] bg-white">
      <div className="flex items-center gap-4 border-b border-[#DED8D2] px-5 py-5">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md">
          <img
            src={logo}
            alt="InCredoBall Logo"
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-[20px] font-black leading-none text-[#2B2B2B]">
            InCredoBall
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Sports Management
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? "bg-[#C97B6C] text-white shadow-xl shadow-[#C97B6C]/20"
                  : "text-slate-600 hover:bg-[#F3E4DF]"
              }`
            }
          >
            {link.icon}
            {link.name}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-5">
        <div className="rounded-3xl bg-[#2B2B2B] p-5 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.25em]">
            Quick Access
          </p>

          <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
            Manage your profile, bookings, and notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full rounded-2xl bg-[#2B2B2B] py-4 text-sm font-black text-white transition hover:bg-[#C97B6C]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}