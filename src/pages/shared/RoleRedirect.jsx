import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RoleRedirect() {
  const { loading, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-semibold">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (profile?.role === "staff") {
    return <Navigate to="/staff" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}