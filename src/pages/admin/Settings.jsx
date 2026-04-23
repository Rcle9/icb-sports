import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";

export default function Settings() {
  const [settings, setSettings] = useState({
    system_name: "InCredoBall Sports Management System",
    contact_email: "",
    allow_google_login: true,
    allow_booking_notifications: true,
    allow_coaching_notifications: true,
    shop_enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

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
    const stringValue = typeof value === "boolean" ? String(value) : String(value ?? "");

    const { error } = await supabase
      .from("system_settings")
      .upsert(
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const entries = Object.entries(settings);

      for (const [key, value] of entries) {
        await saveSetting(key, value);
      }

      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="System Settings" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] md:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Platform Configuration
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Control system behavior and platform preferences.
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Update branding, notifications, login settings, and shop visibility
                from a single admin panel.
              </p>
            </div>
          </div>

          <Card>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black">Settings</h2>
              <p className="mt-1 text-sm text-black">
                Configure core behavior for the system.
              </p>
            </div>

            {loading ? (
              <p className="text-black">Loading settings...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                    {message}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      System Name
                    </label>
                    <input
                      type="text"
                      name="system_name"
                      value={settings.system_name}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-grey outline-none transition focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      value={settings.contact_email}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-grey outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-black">
                    <input
                      type="checkbox"
                      name="allow_google_login"
                      checked={!!settings.allow_google_login}
                      onChange={handleChange}
                    />
                    Allow Google Login
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-black">
                    <input
                      type="checkbox"
                      name="allow_booking_notifications"
                      checked={!!settings.allow_booking_notifications}
                      onChange={handleChange}
                    />
                    Enable Booking Notifications
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-black">
                    <input
                      type="checkbox"
                      name="allow_coaching_notifications"
                      checked={!!settings.allow_coaching_notifications}
                      onChange={handleChange}
                    />
                    Enable Coaching Notifications
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-black">
                    <input
                      type="checkbox"
                      name="shop_enabled"
                      checked={!!settings.shop_enabled}
                      onChange={handleChange}
                    />
                    Enable Merchandise Shop
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}