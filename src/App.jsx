import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Public landing pages
import Landing from "./pages/public/Landing";
import About from "./pages/public/About";
import FacilitiesPage from "./pages/public/Facilities";
import Contact from "./pages/public/Contact";

// Auth pages
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
import UserProfile from "./pages/user/Profile";

// Staff pages
import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import CoachingManager from "./pages/staff/CoachingManager";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import StaffNotifications from "./pages/staff/Notifications";
import StaffProfile from "./pages/staff/Profile";
import ActivityLogs from "./pages/staff/ActivityLogs";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import Facilities from "./pages/admin/Facility";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F3F1]">
        <div className="text-lg font-bold text-[#2B2B2B]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile?.role && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* PUBLIC LANDING PAGES */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/facilities" element={<FacilitiesPage />} />
      <Route path="/contact" element={<Contact />} />

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* SHARED */}
      <Route
        path="/profile-settings"
        element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      {/* USER */}
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
        path="/coaching"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <Coaching />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shop"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <Shop />
          </ProtectedRoute>
        }
      />

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

      {/* STAFF */}
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
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <CoachingManager />
          </ProtectedRoute>
        }
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

      {/* ADMIN */}
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

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}