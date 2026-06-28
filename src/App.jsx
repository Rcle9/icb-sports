import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Landing from "./pages/public/Landing";
import About from "./pages/public/About";
import FacilitiesPage from "./pages/public/Facilities";
import Contact from "./pages/public/Contact";
import PublicShop from "./pages/public/Shop";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import ProfileSettings from "./pages/shared/ProfileSettings";

import UserDashboard from "./pages/user/Dashboard";
import Booking from "./pages/user/Booking";
import MyBookings from "./pages/user/MyBookings";
import UserNotifications from "./pages/user/Notifications";
import UserProfile from "./pages/user/Profile";

import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import StaffNotifications from "./pages/staff/Notifications";
import StaffProfile from "./pages/staff/Profile";
import ActivityLogs from "./pages/staff/ActivityLogs";

import AdminDashboard from "./pages/admin/Dashboard";
import Facilities from "./pages/admin/Facility";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";

function normalizeRole(role) {
  const userRole = String(role || "user").toLowerCase();

  if (userRole === "admin") return "admin";
  if (userRole === "staff") return "staff";

  return "user";
}

function getDashboardPath(role) {
  const userRole = normalizeRole(role);

  if (userRole === "admin") return "/admin/dashboard";
  if (userRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3F1]">
      <div className="text-lg font-bold text-[#2B2B2B]">Loading...</div>
    </div>
  );
}

function PublicLandingRoute() {
  const { user, loading, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    return <Navigate to={getDashboardPath(profile?.role)} replace />;
  }

  return <Landing />;
}

function PublicAuthRoute({ children }) {
  const { user, loading, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    return <Navigate to={getDashboardPath(profile?.role)} replace />;
  }

  return children;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  const role = normalizeRole(profile?.role);

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingRoute />} />

      <Route path="/about" element={<About />} />
      <Route path="/facilities" element={<FacilitiesPage />} />
      <Route path="/shop" element={<PublicShop />} />
      <Route path="/contact" element={<Contact />} />

      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <Login />
          </PublicAuthRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <Register />
          </PublicAuthRoute>
        }
      />

      <Route
        path="/profile-settings"
        element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/booking"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <Booking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <MyBookings />
          </ProtectedRoute>
        }
      />

      <Route path="/coaching" element={<Navigate to="/my-bookings" replace />} />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <UserNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/bookings"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <ManageBookings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/coaching"
        element={<Navigate to="/staff/bookings" replace />}
      />

      <Route
        path="/staff/coach-bookings"
        element={<Navigate to="/staff/bookings" replace />}
      />

      <Route
        path="/staff/inventory"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/maintenance"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Maintenance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/profile"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/activity-logs"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <ActivityLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/facilities"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Facilities />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}