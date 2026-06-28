import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
}

function getRoleLabel(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") return "Admin";
  if (cleanRole === "staff") return "Staff";

  return "User";
}

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "user",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const currentProfile = data || {
        id: user.id,
        full_name: user.email,
        email: user.email,
        role: "user",
      };

      const cleanRole = normalizeRole(currentProfile.role);

      setProfile({
        ...currentProfile,
        role: cleanRole,
      });

      setForm({
        full_name: currentProfile.full_name || "",
        email: currentProfile.email || user.email || "",
        role: cleanRole,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load profile.");
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      if (!profile?.id) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          email: form.email,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setMessage("Profile updated successfully.");
      await loadProfile();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    }
  }

  const initial = (form.full_name || form.email || "U").charAt(0).toUpperCase();

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Profile Settings" />

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white">
            <p className="text-sm font-semibold">Account Preferences</p>

            <h2 className="mt-3 text-4xl font-black">
              Update your profile information.
            </h2>

            <p className="mt-4 text-base text-blue-50">
              Keep your name and account details updated for your facility
              booking records and notifications.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <section className="rounded-[28px] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#C97B6C] text-5xl font-black text-white">
                {initial}
              </div>

              <h3 className="mt-6 text-2xl font-black text-slate-950">
                {form.full_name || "User"}
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                {form.email || "No email"}
              </p>

              <span className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700">
                {getRoleLabel(form.role)}
              </span>
            </section>

            <section className="rounded-[28px] bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-black text-slate-950">
                Edit Profile
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Update the basic information shown across the system.
              </p>

              <form onSubmit={handleSave} className="mt-8 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#C97B6C]"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Email</label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-[#C97B6C]"
                    placeholder="Email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Role</label>

                  <input
                    type="text"
                    value={getRoleLabel(form.role)}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white hover:bg-[#B96A5D]"
                >
                  Save Profile
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}