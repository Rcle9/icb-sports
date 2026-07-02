import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Landing from "./pages/public/Landing";
import About from "./pages/public/About";
import Facilities from "./pages/public/Facilities";
import PublicShop from "./pages/public/Shop";
import Contact from "./pages/public/Contact";
import Help from "./pages/public/Help";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Shared pages
import ProfileSettings from "./pages/shared/ProfileSettings";

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

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/Users";
import FacilityControl from "./pages/admin/Facility";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import PaymentSettings from "./pages/admin/PaymentSettings";
import CommandCenter from "./pages/admin/CommandCenter";

function ScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
      <div className="rounded-2xl bg-white px-6 py-4 text-black shadow">
        Loading...
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowRoles = [] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles.length > 0 && !allowRoles.includes(profile?.role)) {
    if (profile?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (profile?.role === "staff") {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (user) {
    if (profile?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (profile?.role === "staff") {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-medium text-blue-600">404 Error</p>

        <h1 className="mt-2 text-3xl font-bold text-black">Page not found</h1>

        <p className="mt-3 text-sm text-slate-600">
          The page you are trying to open does not exist or the route is wrong.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public landing pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/facilities" element={<Facilities />} />
      <Route path="/shop" element={<PublicShop />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/help" element={<Help />} />

      {/* Auth routes */}
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
        path="/notifications"
        element={
          <ProtectedRoute allowRoles={["user", "staff", "admin"]}>
            <UserNotifications />
          </ProtectedRoute>
        }
      />

      <Route path="/profile" element={<Navigate to="/profile-settings" replace />} />

      <Route
        path="/profile-settings"
        element={
          <ProtectedRoute allowRoles={["user", "staff", "admin"]}>
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
          <ProtectedRoute allowRoles={["staff"]}>
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
          <ProtectedRoute allowRoles={["staff"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/maintenance"
        element={
          <ProtectedRoute allowRoles={["staff"]}>
            <Maintenance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/logs"
        element={
          <ProtectedRoute allowRoles={["staff"]}>
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

      <Route path="/staff/notifications" element={<Navigate to="/notifications" replace />} />
      <Route path="/staff/profile" element={<Navigate to="/profile-settings" replace />} />

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

      <Route path="/admin/notifications" element={<Navigate to="/notifications" replace />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}