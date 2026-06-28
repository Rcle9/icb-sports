import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "user",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const currentProfile = data || {
      id: user.id,
      full_name: user.email,
      email: user.email,
      role: "user",
    };

    setProfile(currentProfile);

    setForm({
      full_name: currentProfile.full_name || "",
      email: currentProfile.email || user.email || "",
      role: currentProfile.role || "user",
    });
  }

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!profile?.id) return;

    await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        email: form.email,
      })
      .eq("id", profile.id);

    loadProfile();
  }

  const initial = (form.full_name || form.email || "U").charAt(0).toUpperCase();

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Profile Settings" />

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Account Preferences</p>
            <h2 className="mt-3 text-4xl font-black">
              Update your profile information.
            </h2>
            <p className="mt-4 text-base text-white/90">
              Keep your name and account details up to date.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <section className="rounded-[28px] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#C97B6C] text-5xl font-black text-white">
                {initial}
              </div>

              <h3 className="mt-6 text-2xl font-black text-[#2B2B2B]">
                {form.full_name || "User"}
              </h3>

              <p className="mt-2 text-sm text-slate-600">{form.email}</p>

              <span className="mt-4 inline-flex rounded-full bg-[#F3E4DF] px-4 py-2 text-xs font-black uppercase text-[#C97B6C]">
                {form.role}
              </span>
            </section>

            <section className="rounded-[28px] bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-black text-[#2B2B2B]">
                Edit Profile
              </h2>

              <form onSubmit={handleSave} className="mt-8 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Full Name
                  </label>

                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Email</label>

                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Role</label>

                  <input
                    value="User"
                    disabled
                    className="w-full rounded-2xl border border-[#DED8D2] bg-slate-50 px-4 py-4"
                  />
                </div>

                <button className="rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white hover:bg-[#D88E80]">
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