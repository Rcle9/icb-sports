import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import useOnlineStatus from "./hooks/useOnlineStatus";
import { processOfflineQueue } from "./services/offlineProcessor";

/* AUTH */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

/* SHARED */
import Unauthorized from "./pages/shared/Unauthorized";
import RoleRedirect from "./pages/shared/RoleRedirect";
import ProfileSettings from "./pages/shared/ProfileSettings";

/* PUBLIC */
import Landing from "./pages/public/Landing";
import Help from "./pages/public/Help";
import Contact from "./pages/public/Contact";

/* USER */
import UserDashboard from "./pages/user/Dashboard";
import Booking from "./pages/user/Booking";
import Coaching from "./pages/user/Coaching";
import Merch from "./pages/user/Merch";
import Notifications from "./pages/user/Notifications";

/* STAFF */
import StaffDashboard from "./pages/staff/Dashboard";
import ManageBookings from "./pages/staff/ManageBookings";
import Inventory from "./pages/staff/Inventory";
import Maintenance from "./pages/staff/Maintenance";
import CoachingManager from "./pages/staff/CoachingManager";
import StaffNotifications from "./pages/staff/Notifications";

/* ADMIN */
import AdminDashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import AdminNotifications from "./pages/admin/Notifications";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import FacilityControl from "./pages/admin/Facility";
import StaffLogs from "./pages/staff/Logs";

import MerchShop from "./pages/user/MerchShop";





function AdminFacilityPage() {
  return <div className="p-6">Admin Facility Control Page</div>;
}





function NotFoundPage() {
  return <div className="p-6 text-red-500">404 - Page not found</div>;
}

export default function App() {
  const isOnline = useOnlineStatus();

  /* OFFLINE SYNC */
  useEffect(() => {
    if (isOnline) {
      processOfflineQueue();
    }
  }, [isOnline]);

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/help" element={<Help />} />
      <Route path="/contact" element={<Contact />} />

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/redirect" element={<RoleRedirect />} />

      {/* PROFILE (ALL ROLES) */}
      <Route
        path="/profile-settings"
        element={
          <ProtectedRoute allowedRoles={["user", "staff", "admin"]}>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      {/* USER ROUTES */}
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
        path="/merch"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <Merch />
          </ProtectedRoute>
        }
      />
      <Route path="/shop" element={<MerchShop />} />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
  path="/shop"
  element={
    <ProtectedRoute allowedRoles={["user"]}>
      <MerchShop />
    </ProtectedRoute>
  }
/>

      {/* STAFF ROUTES */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/bookings"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <ManageBookings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/inventory"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/maintenance"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <Maintenance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/coaching"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <CoachingManager />
          </ProtectedRoute>
        }
      />

      <Route
  path="/staff/logs"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <StaffLogs />
    </ProtectedRoute>
  }
/>

      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <StaffNotifications />
          </ProtectedRoute>
        }
      />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
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
  path="/admin/facility"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <FacilityControl />
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

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminNotifications />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}