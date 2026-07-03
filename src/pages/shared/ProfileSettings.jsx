import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
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

export default function ProfileSettings() {
  const { user, profile } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sidebarRole = normalizeRole(profile?.role);
  const displayRole = getRoleLabel(profile?.role);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
    });
  }, [profile]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!user?.id) {
        throw new Error("User account not found.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role={sidebarRole} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Profile Settings" />

          <div className="mb-6 rounded-[28px] bg-[#C97B6C] p-6 text-white md:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Account Preferences
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Update your profile information.
              </h2>

              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Keep your name and account details up to date for a cleaner
                system experience.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#C97B6C] text-3xl font-bold text-white">
                  {(profile?.full_name || user?.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <h3 className="mt-4 break-words text-xl font-bold text-black">
                  {profile?.full_name || "User"}
                </h3>

                <p className="mt-1 break-all text-sm text-black">
                  {user?.email || "-"}
                </p>

                <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black">
                  {displayRole}
                </p>
              </div>
            </Card>

            <Card>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">Edit Profile</h2>

                <p className="mt-1 text-sm text-black">
                  Update the basic information shown across the system.
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-[#C97B6C]"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Email
                  </label>

                  <input
                    type="text"
                    value={user?.email || ""}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Role
                  </label>

                  <input
                    type="text"
                    value={displayRole}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-semibold text-white transition hover:bg-[#B96A5D] disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}