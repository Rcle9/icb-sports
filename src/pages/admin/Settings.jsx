// src/pages/admin/Settings.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Globe2,
  Mail,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function booleanLabel(value) {
  return value ? "Enabled" : "Disabled";
}

function booleanTone(value) {
  return value ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700";
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [settings, setSettings] = useState({
    system_name: "InCredoBall Sports Management System",
    contact_email: "",
    allow_google_login: true,
    allow_booking_notifications: true,
    shop_enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setupSummary = useMemo(() => {
    const fields = [
      settings.system_name,
      settings.contact_email,
      settings.allow_google_login,
      settings.allow_booking_notifications,
      settings.shop_enabled,
    ];

    const completed = fields.filter((item) => {
      if (typeof item === "boolean") return true;
      return hasValue(item);
    }).length;

    return {
      completed,
      total: fields.length,
      percentage: Math.round((completed / fields.length) * 100),
    };
  }, [settings]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;

      const mapped = {};

      (data || []).forEach((item) => {
        let value = item.setting_value;

        if (value === "true") value = true;
        if (value === "false") value = false;

        mapped[item.setting_key] = value;
      });

      setSettings((prev) => ({
        ...prev,
        ...mapped,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveSetting(key, value) {
    const stringValue =
      typeof value === "boolean" ? String(value) : String(value ?? "");

    const { error } = await supabase.from("system_settings").upsert(
      [
        {
          setting_key: key,
          setting_value: stringValue,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "setting_key" }
    );

    if (error) throw error;
  }

  async function deleteUnusedCoachingSettings() {
    await supabase
      .from("system_settings")
      .delete()
      .in("setting_key", ["allow_coaching_notifications", "coaching_enabled"]);
  }

  function validateSettings() {
    if (!settings.system_name.trim()) {
      setError("System name is required.");
      return false;
    }

    if (
      settings.contact_email.trim() &&
      !settings.contact_email.includes("@")
    ) {
      setError("Please enter a valid contact email.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!validateSettings()) return;

      await deleteUnusedCoachingSettings();

      const entries = Object.entries(settings);

      for (const [key, value] of entries) {
        await saveSetting(key, value);
      }

      setMessage("Settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="admin"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="System Settings"
            subtitle="Control platform branding, login access, notification behavior, and shop visibility."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Platform Configuration
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Control system behavior and preferences.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Update system branding, contact email, login options, booking
                  notifications, and merchandise shop visibility from one admin
                  settings panel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Setup" value={`${setupSummary.percentage}%`} />
                <HeroStat
                  label="Google"
                  value={booleanLabel(settings.allow_google_login)}
                />
                <HeroStat
                  label="Alerts"
                  value={booleanLabel(settings.allow_booking_notifications)}
                />
                <HeroStat label="Shop" value={booleanLabel(settings.shop_enabled)} />
              </div>
            </div>
          </section>

          {loading ? (
            <section className="icb-card p-8">
              <p className="text-sm font-semibold text-slate-500">
                Loading settings...
              </p>
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Setup Progress"
                  value={`${setupSummary.percentage}%`}
                  description={`${setupSummary.completed}/${setupSummary.total} settings configured`}
                  icon={<SettingsIcon size={22} />}
                  tone="coral"
                />

                <MetricCard
                  title="Google Login"
                  value={booleanLabel(settings.allow_google_login)}
                  description="Third-party sign-in option"
                  icon={<Globe2 size={22} />}
                  tone={settings.allow_google_login ? "green" : "slate"}
                />

                <MetricCard
                  title="Booking Alerts"
                  value={booleanLabel(settings.allow_booking_notifications)}
                  description="System booking notifications"
                  icon={<Bell size={22} />}
                  tone={
                    settings.allow_booking_notifications ? "green" : "slate"
                  }
                />

                <MetricCard
                  title="Shop Display"
                  value={booleanLabel(settings.shop_enabled)}
                  description="Landing page merchandise shop"
                  icon={<ShoppingBag size={22} />}
                  tone={settings.shop_enabled ? "green" : "slate"}
                />
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
                <div className="space-y-6">
                  <section className="icb-card p-5 sm:p-6">
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="icb-eyebrow">Core Settings</p>

                        <h3 className="icb-section-title mt-2">
                          System Information
                        </h3>

                        <p className="icb-section-subtitle">
                          Configure the main name and contact email used by the
                          InCredoBall platform.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadSettings}
                        className="icb-btn-light"
                      >
                        <RefreshCw size={17} />
                        Reload
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                      <InputField
                        label="System Name"
                        name="system_name"
                        value={settings.system_name}
                        onChange={handleChange}
                        placeholder="InCredoBall Sports Management System"
                        icon={<ShieldCheck size={18} />}
                      />

                      <InputField
                        label="Contact Email"
                        name="contact_email"
                        type="email"
                        value={settings.contact_email}
                        onChange={handleChange}
                        placeholder="incredoball@example.com"
                        icon={<Mail size={18} />}
                      />
                    </div>
                  </section>

                  <section className="icb-card p-5 sm:p-6">
                    <div className="mb-6">
                      <p className="icb-eyebrow">Feature Toggles</p>

                      <h3 className="icb-section-title mt-2">
                        Platform Behavior
                      </h3>

                      <p className="icb-section-subtitle">
                        Turn system features on or off without changing the
                        booking workflow.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <ToggleCard
                        name="allow_google_login"
                        checked={!!settings.allow_google_login}
                        onChange={handleChange}
                        title="Allow Google Login"
                        description="Let users sign in with their Google account if configured in Supabase Auth."
                        icon={<Globe2 size={20} />}
                      />

                      <ToggleCard
                        name="allow_booking_notifications"
                        checked={!!settings.allow_booking_notifications}
                        onChange={handleChange}
                        title="Enable Booking Notifications"
                        description="Allow the system to send booking-related notifications to users, staff, and admins."
                        icon={<Bell size={20} />}
                      />

                      <ToggleCard
                        name="shop_enabled"
                        checked={!!settings.shop_enabled}
                        onChange={handleChange}
                        title="Enable Merchandise Shop"
                        description="Show or hide the public merchandise shop section on the landing pages."
                        icon={<ShoppingBag size={20} />}
                      />
                    </div>
                  </section>
                </div>

                <aside className="space-y-6">
                  <section className="icb-card p-5 sm:p-6">
                    <div className="mb-6">
                      <p className="icb-eyebrow">Settings Summary</p>

                      <h3 className="icb-section-title mt-2">
                        Current Configuration
                      </h3>

                      <p className="icb-section-subtitle">
                        Review the platform settings before saving changes.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <SummaryRow
                        label="System Name"
                        value={settings.system_name || "-"}
                      />

                      <SummaryRow
                        label="Contact Email"
                        value={settings.contact_email || "-"}
                      />

                      <SummaryRow
                        label="Google Login"
                        value={booleanLabel(settings.allow_google_login)}
                        badgeClass={booleanTone(settings.allow_google_login)}
                      />

                      <SummaryRow
                        label="Booking Notifications"
                        value={booleanLabel(
                          settings.allow_booking_notifications
                        )}
                        badgeClass={booleanTone(
                          settings.allow_booking_notifications
                        )}
                      />

                      <SummaryRow
                        label="Merchandise Shop"
                        value={booleanLabel(settings.shop_enabled)}
                        badgeClass={booleanTone(settings.shop_enabled)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="icb-btn-accent mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={17} />
                      {saving ? "Saving..." : "Save Settings"}
                    </button>
                  </section>

                  <section className="icb-card bg-[#0B1F33] p-5 text-white sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                      Facility Booking Scope
                    </p>

                    <h3 className="mt-3 text-2xl font-black">
                      Facility booking only
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-7 text-white/75">
                      Coaching settings are automatically cleaned from the
                      system settings table to keep the final project scope
                      focused on facility booking.
                    </p>

                    <div className="mt-5 rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">
                        Admin Reminder
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-white">
                        After changing public settings, refresh the landing page
                        and user portal to confirm the updated behavior.
                      </p>
                    </div>
                  </section>
                </aside>
              </section>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`icb-input ${icon ? "pl-11" : ""}`}
        />
      </div>
    </div>
  );
}

function ToggleCard({ name, checked, onChange, title, description, icon }) {
  return (
    <label className="flex cursor-pointer flex-col gap-4 rounded-3xl border border-[#DED8D2] bg-[#FBFAF9] p-5 transition hover:border-[#C97B6C]/50 hover:bg-[#FFF8F6] sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
          {icon}
        </span>

        <div>
          <h4 className="text-lg font-black text-[#0B1F33]">{title}</h4>

          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {description}
          </p>

          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${booleanTone(
              checked
            )}`}
          >
            {booleanLabel(checked)}
          </span>
        </div>
      </div>

      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-5 w-5 shrink-0 accent-[#C97B6C]"
      />
    </label>
  );
}

function SummaryRow({ label, value, badgeClass }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>

      {badgeClass ? (
        <span
          className={`safe-text rounded-full px-3 py-1 text-xs font-black uppercase ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="safe-text text-right text-sm font-black text-[#0B1F33]">
          {value}
        </p>
      )}
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "coral" }) {
  const toneClasses = {
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="safe-text mt-3 text-3xl font-black text-[#0B1F33]">
            {value}
          </h3>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            toneClasses[tone] || toneClasses.coral
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="safe-text mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}