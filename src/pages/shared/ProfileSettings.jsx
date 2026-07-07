// src/pages/shared/ProfileSettings.jsx

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";

function getRoleForSidebar(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function getRoleLabel(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "Administrator";
  if (value === "staff") return "Staff";

  return "Customer";
}

function getRoleDescription(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") {
    return "You can manage users, facilities, reports, settings, and system operations.";
  }

  if (value === "staff") {
    return "You can manage bookings, payments, walk-in reservations, maintenance, and inventory.";
  }

  return "You can book facilities, upload payment proof, track reservations, and view receipts.";
}

function getInitials(name, email) {
  const cleanName = String(name || "").trim();

  if (cleanName) {
    const parts = cleanName.split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  }

  return String(email || "U").slice(0, 2).toUpperCase();
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function ProfileSettings() {
  const { user, profile } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
  });

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [localProfile, setLocalProfile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeProfile = localProfile || profile;
  const sidebarRole = getRoleForSidebar(activeProfile?.role);
  const roleLabel = getRoleLabel(activeProfile?.role);

  const initials = useMemo(() => {
    return getInitials(activeProfile?.full_name, user?.email);
  }, [activeProfile?.full_name, user?.email]);

  const profileCompleteness = useMemo(() => {
    let score = 0;

    if (activeProfile?.full_name) score += 50;
    if (user?.email) score += 30;
    if (activeProfile?.role) score += 20;

    return score;
  }, [activeProfile, user]);

  useEffect(() => {
    setLocalProfile(profile || null);

    setForm({
      full_name: profile?.full_name || "",
    });
  }, [profile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function refreshProfile() {
    try {
      if (!user?.id) return;

      setRefreshing(true);
      setError("");
      setMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setLocalProfile(data || null);

      setForm({
        full_name: data?.full_name || "",
      });

      setMessage("Profile refreshed.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to refresh profile.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      if (!user?.id) return;

      const cleanName = form.full_name.trim();

      if (!cleanName) {
        setError("Full name is required.");
        return;
      }

      setSaving(true);
      setError("");
      setMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      setLocalProfile(data || null);

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role={sidebarRole} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Profile Settings" subtitle="Manage your account information" />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Account Preferences
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Update your profile information.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  You can update your display name only. Your email address is
                  locked because it is used for login and account identification.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <HeroStat label="Role" value={roleLabel} />
                <HeroStat label="Profile" value={`${profileCompleteness}%`} />
                <HeroStat label="Status" value="Active" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <div className="icb-card overflow-hidden">
                <div className="bg-[#0B1F33] px-6 py-8 text-center text-white">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] bg-white text-4xl font-black text-[#0B1F33] shadow-sm">
                    {initials}
                  </div>

                  <h3 className="mt-5 break-words text-2xl font-black">
                    {activeProfile?.full_name || "User"}
                  </h3>

                  <p className="mt-2 break-all text-sm font-semibold text-white/75">
                    {user?.email || "-"}
                  </p>

                  <span className="mt-4 inline-flex rounded-full bg-[#C97B6C] px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                    {roleLabel}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-sm font-semibold leading-6 text-slate-600">
                    {getRoleDescription(activeProfile?.role)}
                  </p>
                </div>
              </div>

              <div className="icb-card p-5">
                <p className="icb-eyebrow">Account Summary</p>

                <div className="mt-5 space-y-3">
                  <SummaryItem
                    icon={<UserRound size={18} />}
                    label="Full Name"
                    value={activeProfile?.full_name || "-"}
                  />

                  <SummaryItem
                    icon={<Mail size={18} />}
                    label="Email"
                    value={user?.email || "-"}
                  />

                  <SummaryItem
                    icon={<ShieldCheck size={18} />}
                    label="Role"
                    value={roleLabel}
                  />

                  <SummaryItem
                    icon={<CalendarCheck size={18} />}
                    label="Created At"
                    value={formatDateTime(activeProfile?.created_at)}
                  />
                </div>
              </div>
            </aside>

            <section className="space-y-6">
              <div className="icb-card p-5 sm:p-6">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="icb-eyebrow">Edit Profile</p>

                    <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                      Basic information
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Only your full name can be edited by the user.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={refreshProfile}
                    disabled={refreshing || saving}
                    className="icb-btn-light"
                  >
                    <RefreshCw
                      size={17}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="icb-label">Full Name</label>

                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      className="icb-input"
                      placeholder="Enter your full name"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      This name will appear in your profile, booking records, and
                      system activities.
                    </p>
                  </div>

                  <div>
                    <label className="icb-label">Email Address</label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        readOnly
                        aria-disabled="true"
                        tabIndex={-1}
                        className="icb-input cursor-not-allowed bg-slate-100 pl-11 pr-12 text-slate-500 opacity-80"
                      />

                      <Lock
                        size={17}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Email editing is disabled. This email is used for login and
                      cannot be changed by the user.
                    </p>
                  </div>

                  <div>
                    <label className="icb-label">Account Role</label>

                    <input
                      type="text"
                      value={roleLabel}
                      readOnly
                      disabled
                      className="icb-input cursor-not-allowed bg-slate-100 text-slate-500 opacity-80"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Only the admin can change account roles.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          full_name: activeProfile?.full_name || "",
                        })
                      }
                      disabled={saving}
                      className="icb-btn-light"
                    >
                      Reset Changes
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="icb-btn-accent"
                    >
                      <Save size={18} />
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoCard
                  icon={<CheckCircle2 size={22} />}
                  title="Verified Login"
                  description="Your account is connected to Supabase Authentication."
                />

                <InfoCard
                  icon={<ShieldCheck size={22} />}
                  title="Role Protected"
                  description="Your pages are protected based on your assigned role."
                />

                <InfoCard
                  icon={<Lock size={22} />}
                  title="Locked Email"
                  description="Your email is protected and cannot be edited from profile settings."
                />
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-lg font-black sm:text-2xl">{value}</p>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-black text-[#0B1F33]">
            {String(value || "-")}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }) {
  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
        {icon}
      </div>

      <h4 className="mt-4 text-lg font-black text-[#0B1F33]">{title}</h4>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}