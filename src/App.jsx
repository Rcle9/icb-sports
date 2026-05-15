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
import Coaching from "./pages/user/Coaching";
import UserNotifications from "./pages/user/Notifications";
import UserProfile from "./pages/user/Profile";

import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import CoachingManager from "./pages/staff/CoachingManager";
import CoachBookings from "./pages/staff/CoachBookings";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import StaffNotifications from "./pages/staff/Notifications";
import StaffProfile from "./pages/staff/Profile";
import ActivityLogs from "./pages/staff/ActivityLogs";

import CoachDashboard from "./pages/coach/Dashboard";

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

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && profile?.role && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/facilities" element={<FacilitiesPage />} />
      <Route path="/shop" element={<PublicShop />} />
      <Route path="/contact" element={<Contact />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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
          <ProtectedRoute allowedRoles={["user", "coach"]}>
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
        path="/coach"
        element={
          <ProtectedRoute allowedRoles={["coach"]}>
            <CoachDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/dashboard"
        element={
          <ProtectedRoute allowedRoles={["coach"]}>
            <CoachDashboard />
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
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <CoachingManager />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/coach-bookings"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <CoachBookings />
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