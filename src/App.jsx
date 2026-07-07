// src/App.jsx

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";

// Auth / public pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Public landing pages
import Landing from "./pages/public/Landing";
import About from "./pages/public/About";
import Facilities from "./pages/public/Facilities";
import PublicShop from "./pages/public/Shop";
import Contact from "./pages/public/Contact";
import Help from "./pages/public/Help";

// Shared pages
import ProfileSettings from "./pages/shared/ProfileSettings";
import Unauthorized from "./pages/shared/Unauthorized";

// User pages
import UserDashboard from "./pages/user/Dashboard";
import Booking from "./pages/user/Booking";
import MyBookings from "./pages/user/MyBookings";
import UserNotifications from "./pages/user/Notifications";
import BookingTimeline from "./pages/user/BookingTimeline";

// Staff pages
import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import ActivityLogs from "./pages/staff/ActivityLogs";
import WalkInBooking from "./pages/staff/WalkInBooking";
import AvailabilityBoard from "./pages/staff/AvailabilityBoard";
import OperationsBoard from "./pages/staff/OperationsBoard";
import StaffNotifications from "./pages/staff/Notifications";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/Users";
import FacilityControl from "./pages/admin/Facility";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import PaymentSettings from "./pages/admin/PaymentSettings";
import CommandCenter from "./pages/admin/CommandCenter";
import AdminNotifications from "./pages/admin/Notifications";

function ScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3F1] p-6">
      <div className="w-full max-w-md rounded-[28px] border border-[#DED8D2] bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0B1F33] text-white">
          <span className="text-2xl font-black">🏆</span>
        </div>

        <h1 className="mt-6 text-2xl font-black text-[#0B1F33]">
          InCredoBall Sports
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          Loading your workspace...
        </p>

        <div className="mt-6 rounded-2xl bg-[#F5F3F1] px-5 py-4 text-sm font-black text-[#0B1F33]">
          Please wait
        </div>
      </div>
    </div>
  );
}

function getCurrentRole(user, profile) {
  const role =
    profile?.role || user?.user_metadata?.role || user?.app_metadata?.role || "user";

  const cleanRole = String(role || "user").toLowerCase().trim();

  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
}

function getRoleDashboard(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function ProtectedRoute({
  children,
  allowRoles = [],
  allowedRoles = [],
}) {
  const { user, profile, loading } = useAuth();

  const roles = allowRoles.length > 0 ? allowRoles : allowedRoles;

  if (loading) return <ScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getCurrentRole(user, profile);

  if (roles.length > 0 && !roles.includes(currentRole)) {
    return <Navigate to={getRoleDashboard(currentRole)} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (user) {
    const currentRole = getCurrentRole(user, profile);

    return <Navigate to={getRoleDashboard(currentRole)} replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getCurrentRole(user, profile);

  return <Navigate to={getRoleDashboard(currentRole)} replace />;
}

function RoleNotificationsRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getCurrentRole(user, profile);

  if (currentRole === "admin") {
    return <Navigate to="/admin/notifications" replace />;
  }

  if (currentRole === "staff") {
    return <Navigate to="/staff/notifications" replace />;
  }

  return <Navigate to="/user/notifications" replace />;
}

function RoleProfileRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getCurrentRole(user, profile);

  if (currentRole === "admin") {
    return <Navigate to="/admin/profile" replace />;
  }

  if (currentRole === "staff") {
    return <Navigate to="/staff/profile" replace />;
  }

  return <Navigate to="/user/profile" replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3F1] p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C97B6C]">
          404 Error
        </p>

        <h1 className="mt-2 text-3xl font-black text-[#0B1F33]">
          Page not found
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          The page you are trying to open does not exist or the route is wrong.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SidebarProvider>
      <Routes>
        {/* Public landing website */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/shop" element={<PublicShop />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />

        {/* Auth pages */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Shared role redirects */}
        <Route path="/home" element={<RoleHomeRedirect />} />
        <Route path="/app" element={<RoleHomeRedirect />} />
        <Route path="/notifications" element={<RoleNotificationsRedirect />} />
        <Route path="/profile" element={<RoleProfileRedirect />} />
        <Route path="/profile-settings" element={<RoleProfileRedirect />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* User routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking-timeline"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <BookingTimeline />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/notifications"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <UserNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/profile"
          element={
            <ProtectedRoute allowRoles={["user"]}>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        {/* Staff routes */}
        <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />

        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowRoles={["staff"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/operations"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <OperationsBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/operations-board"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <OperationsBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/availability-board"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <AvailabilityBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/bookings"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <ManageBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/manage-bookings"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <ManageBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/walk-in-booking"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <WalkInBooking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/inventory"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <Inventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/maintenance"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <Maintenance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/logs"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/activity-logs"
          element={
            <ProtectedRoute allowRoles={["staff", "admin"]}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/notifications"
          element={
            <ProtectedRoute allowRoles={["staff"]}>
              <StaffNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/profile"
          element={
            <ProtectedRoute allowRoles={["staff"]}>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/command-center"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <CommandCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/operations"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <OperationsBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/operations-board"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <OperationsBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/availability-board"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AvailabilityBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/manage-bookings"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/facility"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <FacilityControl />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/facilities"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <FacilityControl />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/activity-logs"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/payment-settings"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <PaymentSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </SidebarProvider>
  );
}