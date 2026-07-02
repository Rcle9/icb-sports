import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileBottomNav from "./MobileBottomNav";

const pageTitles = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Welcome to your InCredoBall account.",
  },
  "/booking": {
    title: "Facility Booking",
    subtitle: "Book available sports facilities.",
  },
  "/my-bookings": {
    title: "My Bookings",
    subtitle: "Track your reservations and booking status.",
  },
  "/booking-timeline": {
    title: "Booking Timeline",
    subtitle: "View your booking activity timeline.",
  },
  "/notifications": {
    title: "Notifications",
    subtitle: "View your booking and system updates.",
  },
  "/profile": {
    title: "Profile Settings",
    subtitle: "Manage your account information.",
  },

  "/staff/dashboard": {
    title: "Dashboard",
    subtitle: "Staff operations and facility monitoring.",
  },
  "/staff/operations": {
    title: "Operations Board",
    subtitle: "Monitor daily facility operations.",
  },
  "/staff/availability-board": {
    title: "Availability Board",
    subtitle: "Check facility availability by date and time.",
  },
  "/staff/manage-bookings": {
    title: "Manage Bookings",
    subtitle: "Review reservations, payments, maintenance, and completion.",
  },
  "/staff/walk-in-booking": {
    title: "Walk-in Booking",
    subtitle: "Create bookings for walk-in customers.",
  },
  "/staff/inventory": {
    title: "Inventory",
    subtitle: "Manage facility products, supplies, and equipment.",
  },
  "/staff/maintenance": {
    title: "Maintenance",
    subtitle: "Track facility repair and maintenance requests.",
  },
  "/staff/activity-logs": {
    title: "Activity Logs",
    subtitle: "Review staff and system activity records.",
  },
  "/staff/notifications": {
    title: "Notifications",
    subtitle: "Real-time system alerts and booking updates.",
  },

  "/admin/dashboard": {
    title: "Dashboard",
    subtitle: "Admin overview and system monitoring.",
  },
  "/admin/command-center": {
    title: "Command Center",
    subtitle: "Monitor overall system operations.",
  },
  "/admin/operations": {
    title: "Operations Board",
    subtitle: "View facility operation activity.",
  },
  "/admin/availability-board": {
    title: "Availability Board",
    subtitle: "Monitor facility availability.",
  },
  "/admin/facilities": {
    title: "Facility Management",
    subtitle: "Manage sports facilities and facility images.",
  },
  "/admin/users": {
    title: "User Management",
    subtitle: "Manage users, staff, and admin accounts.",
  },
  "/admin/reports": {
    title: "Reports",
    subtitle: "View system reports and booking summaries.",
  },
  "/admin/activity-logs": {
    title: "Activity Logs",
    subtitle: "Review system activity records.",
  },
  "/admin/notifications": {
    title: "Notifications",
    subtitle: "View admin system notifications.",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "Manage system configuration.",
  },
};

export default function DashboardLayout({ role = "user" }) {
  const location = useLocation();
  const page = pageTitles[location.pathname] || {
    title: "Dashboard",
    subtitle: "",
  };

  return (
    <div className="min-h-screen bg-[#F5F3F1] lg:pl-[280px]">
      <Sidebar role={role} />

      <main className="min-h-screen px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <Topbar title={page.title} subtitle={page.subtitle} />

          <Outlet />
        </div>
      </main>

      <MobileBottomNav role={role} />
    </div>
  );
}