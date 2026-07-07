// src/pages/shared/RoleRedirect.jsx

import { Navigate } from "react-router-dom";
import { Loader2, Trophy } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function getRedirectPath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3F1] p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[34px] border border-[#DED8D2] bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#C97B6C]/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0B1F33] text-white">
            <Trophy size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-black text-[#0B1F33]">
            InCredoBall Sports
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Checking your account access...
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-[#F5F3F1] px-5 py-4">
            <Loader2 size={20} className="animate-spin text-[#C97B6C]" />

            <span className="text-sm font-black text-[#0B1F33]">
              Redirecting
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RoleRedirect() {
  const { user, profile, loading, authReady } = useAuth();

  if (loading || !authReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRedirectPath(profile?.role)} replace />;
}