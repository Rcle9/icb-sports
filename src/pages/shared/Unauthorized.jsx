// src/pages/shared/Unauthorized.jsx

import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function getHomePath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "Admin Account";
  if (normalizedRole === "staff") return "Staff Account";

  return "User Account";
}

export default function Unauthorized() {
  const { profile, user } = useAuth();

  const homePath = user ? getHomePath(profile?.role) : "/";
  const roleLabel = user ? getRoleLabel(profile?.role) : "Guest Access";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F3F1] px-5 py-10 text-[#0B1F33]">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/15 blur-3xl" />
      <div className="absolute -bottom-36 -right-36 h-96 w-96 rounded-full bg-[#0B1F33]/10 blur-3xl" />

      <div className="absolute inset-0 opacity-[0.05]">
        <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,#0B1F33_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[42px] border border-[#DED8D2] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-[#0B1F33] p-8 text-white md:p-10">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#C97B6C]/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute inset-0 opacity-[0.08]">
              <div className="absolute left-[-120px] top-20 h-[360px] w-[360px] rounded-full border-[28px] border-white" />
              <div className="absolute bottom-[-150px] right-[-150px] h-[420px] w-[420px] rounded-full border-[34px] border-white" />
            </div>

            <div className="relative flex h-full min-h-[360px] flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#E8A093] backdrop-blur">
                  <ShieldAlert size={15} />
                  Restricted Page
                </div>

                <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight md:text-6xl">
                  Access
                  <span className="block text-[#E8A093]">Denied.</span>
                </h1>

                <p className="mt-6 max-w-md text-base font-semibold leading-8 text-white/75">
                  This page is protected and your current account does not have
                  permission to open it.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <InfoBadge icon={LockKeyhole} title="Protected" text="Route" />
                <InfoBadge icon={ShieldCheck} title={roleLabel} text="Detected" />
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F3E4DF] text-[#B86658]">
              <Trophy size={30} />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#C97B6C]">
              InCredoBall Sports
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33]">
              You do not have access to this page.
            </h2>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
              You may be trying to open a page for another role. Please return
              to your proper dashboard or go back to the public website.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#DED8D2] bg-[#F5F3F1] p-5">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#C97B6C] shadow-sm">
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <h3 className="font-black text-[#0B1F33]">
                    Current Access Level
                  </h3>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {roleLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                to={homePath}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:bg-[#B86658]"
              >
                <Home size={18} />
                Go to Dashboard
              </Link>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DED8D2] bg-white px-6 py-4 text-sm font-black text-[#0B1F33] transition hover:bg-[#FFF8F6]"
              >
                <ArrowLeft size={18} />
                Back to Website
              </Link>
            </div>

            {!user && (
              <Link
                to="/login"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1F33] px-6 py-4 text-sm font-black text-white transition hover:bg-[#C97B6C]"
              >
                Login to Continue
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBadge({ icon: Icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C97B6C] text-white">
        <Icon size={20} />
      </div>

      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>

      <p className="mt-1 text-sm font-semibold text-white/60">{text}</p>
    </div>
  );
}