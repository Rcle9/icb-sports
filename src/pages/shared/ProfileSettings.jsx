// src/pages/shared/ProfileSettings.jsx

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function formatRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";

  return "User";
}

function getRoleHome(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "/admin/dashboard";
  if (value === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function isValidContactNumber(value) {
  const clean = String(value || "").replace(/\s|-/g, "");

  if (!clean) return true;

  return /^(\+63|0)?9\d{9}$/.test(clean) || clean.length >= 7;
}

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();

  const currentRole = String(profile?.role || "user").toLowerCase();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      email: profile?.email || user?.email || "",
      contact_number: profile?.contact_number || "",
      role: profile?.role || "user",
    });
  }, [profile, user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  async function handleRefreshProfile() {
    try {
      setRefreshing(true);
      setError("");
      setMessage("");

      if (refreshProfile) {
        await refreshProfile();
      }

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
      setLoading(true);
      setError("");
      setMessage("");

      const cleanName = String(form.full_name || "").trim();
      const cleanContact = String(form.contact_number || "").trim();

      if (!cleanName) {
        setError("Full name is required.");
        return;
      }

      if (!isValidContactNumber(cleanContact)) {
        setError("Please enter a valid contact number.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          contact_number: cleanContact,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      if (refreshProfile) {
        await refreshProfile();
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role={currentRole} />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Profile Settings"
            subtitle="Manage your account information"
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}
          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Account Profile
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Update your profile information.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  You can update your name and contact number here. Your email
                  address and role are locked for security.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <HeroStat label="Role" value={formatRole(currentRole)} />
                <HeroStat label="Email" value="Locked" />
                <HeroStat label="Contact" value={form.contact_number ? "Saved" : "Missing"} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form onSubmit={handleSubmit} className="icb-card p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="icb-eyebrow">Profile Form</p>

                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Personal details
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Keep your contact information updated so staff can reach you
                    about your bookings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshProfile}
                  disabled={refreshing}
                  className="icb-btn-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="icb-label flex items-center gap-2">
                    <UserRound size={16} />
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="icb-input"
                    required
                  />
                </div>

                <div>
                  <label className="icb-label flex items-center gap-2">
                    <Phone size={16} />
                    Contact Number
                  </label>

                  <input
                    type="tel"
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                    placeholder="Example: 09123456789"
                    className="icb-input"
                  />

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Staff can use this number to contact you about booking or
                    payment concerns.
                  </p>
                </div>

                <div>
                  <label className="icb-label flex items-center gap-2">
                    <Mail size={16} />
                    Email Address
                  </label>

                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      disabled
                      readOnly
                      aria-disabled="true"
                      tabIndex={-1}
                      className="icb-input cursor-not-allowed bg-slate-100 pr-12 text-slate-500"
                    />

                    <Lock
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Email cannot be edited from profile settings.
                  </p>
                </div>

                <div>
                  <label className="icb-label flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Account Role
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      name="role"
                      value={formatRole(form.role)}
                      disabled
                      readOnly
                      aria-disabled="true"
                      tabIndex={-1}
                      className="icb-input cursor-not-allowed bg-slate-100 pr-12 text-slate-500"
                    />

                    <Lock
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Role changes are managed by the administrator.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="icb-btn-accent mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Profile"}
              </button>
            </form>

            <aside className="space-y-6">
              <section className="icb-card p-5 sm:p-6">
                <p className="icb-eyebrow">Profile Summary</p>

                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Account information
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <SummaryItem label="Full Name" value={form.full_name || "-"} />
                  <SummaryItem label="Email" value={form.email || "-"} />
                  <SummaryItem
                    label="Contact Number"
                    value={form.contact_number || "Not added yet"}
                    warning={!form.contact_number}
                  />
                  <SummaryItem label="Role" value={formatRole(form.role)} />
                </div>
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-[#0B1F33] p-6 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#E8A093]">
                  <CheckCircle2 size={22} />
                </div>

                <h3 className="mt-4 text-2xl font-black">
                  Why add your contact number?
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                  Staff may need to contact you if your payment proof has an
                  issue, your booking needs confirmation, or there are schedule
                  changes.
                </p>

                <a
                  href={getRoleHome(currentRole)}
                  className="mt-5 inline-flex rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
                >
                  Back to Dashboard
                </a>
              </section>
            </aside>
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
      <p className="mt-1 truncate text-lg font-black sm:text-xl">{value}</p>
    </div>
  );
}

function SummaryItem({ label, value, warning = false }) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        warning ? "bg-orange-50" : "bg-[#F5F3F1]"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          warning ? "text-orange-500" : "text-slate-400"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 break-words text-sm font-black ${
          warning ? "text-orange-700" : "text-[#0B1F33]"
        }`}
      >
        {String(value || "-")}
      </p>
    </div>
  );
}