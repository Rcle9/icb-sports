import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Auth / public pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Shared pages
import ProfileSettings from "./pages/shared/ProfileSettings";

// User pages
import UserDashboard from "./pages/user/Dashboard";
import Booking from "./pages/user/Booking";
import Coaching from "./pages/user/Coaching";
import Shop from "./pages/user/Shop";
import UserNotifications from "./pages/user/Notifications";

// Staff pages
import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import CoachingManager from "./pages/staff/CoachingManager";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import ActivityLogs from "./pages/staff/ActivityLogs";
import StaffNotifications from "./pages/staff/Notifications";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/Users";
import FacilityControl from "./pages/admin/Facility";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import AdminNotifications from "./pages/admin/Notifications";

function ScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
      <div className="rounded-2xl bg-white px-6 py-4 shadow text-black">
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
    if (profile?.role === "admin") return <Navigate to="/admin" replace />;
    if (profile?.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (user) {
    if (profile?.role === "admin") return <Navigate to="/admin" replace />;
    if (profile?.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <ScreenLoader />;

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (profile?.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/dashboard" replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-6">
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
      <Route path="/" element={<RootRedirect />} />

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

      <Route
        path="/dashboard"
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
        path="/coaching"
        element={
          <ProtectedRoute allowRoles={["user"]}>
            <Coaching />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shop"
        element={
          <ProtectedRoute allowRoles={["user"]}>
            <Shop />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowRoles={["user"]}>
            <UserNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute allowRoles={["staff"]}>
            <StaffDashboard />
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
        path="/staff/coaching"
        element={
          <ProtectedRoute allowRoles={["staff"]}>
            <CoachingManager />
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
        path="/staff/notifications"
        element={
          <ProtectedRoute allowRoles={["staff"]}>
            <StaffNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <AdminDashboard />
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
        path="/admin/reports"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <Reports />
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
        path="/admin/notifications"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <AdminNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile-settings"
        element={
          <ProtectedRoute allowRoles={["user", "staff", "admin"]}>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      <Route path="/help" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}