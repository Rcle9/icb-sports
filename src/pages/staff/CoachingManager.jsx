import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

const FALLBACK_IMAGE = "https://via.placeholder.com/300x300?text=Coach";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

export default function CoachingManager() {
  const [coaches, setCoaches] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    description: "",
    experience: "",
    rate_per_hour: "",
    image_path: "",
    available_start_time: "08:00",
    available_end_time: "20:00",
    is_active: true,
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCoaches();

    const channel = supabase
      .channel(`coaches-manager-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaches" },
        () => fetchCoaches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchCoaches() {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setCoaches(data || []);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("coach-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("coach-images")
        .getPublicUrl(fileName);

      setForm((prev) => ({
        ...prev,
        image_path: data.publicUrl,
      }));

      setMessage("Image uploaded successfully.");
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      specialty: "",
      description: "",
      experience: "",
      rate_per_hour: "",
      image_path: "",
      available_start_time: "08:00",
      available_end_time: "20:00",
      is_active: true,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (form.available_start_time >= form.available_end_time) {
      setError("Start time must be earlier than end time.");
      return;
    }

    const payload = {
      name: form.name,
      specialty: form.specialty,
      description: form.description,
      experience: form.experience,
      rate_per_hour: Number(form.rate_per_hour || 0),
      image_path: form.image_path,
      image_url: form.image_path,
      available_start_time: form.available_start_time,
      available_end_time: form.available_end_time,
      is_active: form.is_active,
    };

    const response = editingId
      ? await supabase.from("coaches").update(payload).eq("id", editingId)
      : await supabase.from("coaches").insert([payload]);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setMessage(editingId ? "Coach updated successfully." : "Coach added successfully.");
    resetForm();
    fetchCoaches();
  }

  function handleEdit(coach) {
    setEditingId(coach.id);

    setForm({
      name: coach.name || "",
      specialty: coach.specialty || "",
      description: coach.description || "",
      experience: coach.experience || "",
      rate_per_hour: coach.rate_per_hour || "",
      image_path: coach.image_path || coach.image_url || "",
      available_start_time: cleanTime(coach.available_start_time),
      available_end_time: cleanTime(coach.available_end_time || "20:00"),
      is_active: coach.is_active !== false,
    });
  }

  async function toggleCoach(coach) {
    const { error } = await supabase
      .from("coaches")
      .update({ is_active: coach.is_active === false })
      .eq("id", coach.id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchCoaches();
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coach Management" />

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

          <section className="mb-6 rounded-[28px] bg-gradient-to-br from-blue-600 to-slate-900 p-8 text-white">
            <p className="text-sm font-semibold">Coach Control</p>
            <h2 className="mt-2 text-3xl font-black">
              Manage coaches, photos, rates, and available time.
            </h2>
            <p className="mt-2 text-sm text-blue-50">
              Set the coach hourly price so users can see the correct booking total.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <section className="rounded-[28px] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                {editingId ? "Edit Coach" : "Add Coach"}
              </h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Coach Name"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />

                <input
                  name="specialty"
                  value={form.specialty}
                  onChange={handleChange}
                  placeholder="Specialty / Sport"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                <input
                  type="number"
                  name="rate_per_hour"
                  value={form.rate_per_hour}
                  onChange={handleChange}
                  placeholder="Coach price per hour"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  min="0"
                />

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Coach description"
                  className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                <input
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="Experience"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="available_start_time"
                      value={form.available_start_time}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="available_end_time"
                      value={form.available_end_time}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Coach Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />

                  {uploading && (
                    <p className="mt-2 text-sm text-blue-600">Uploading...</p>
                  )}

                  {form.image_path && (
                    <img
                      src={form.image_path}
                      alt="Coach preview"
                      className="mt-3 h-28 w-28 rounded-2xl object-cover"
                    />
                  )}
                </div>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  Active Coach
                </label>

                <div className="flex gap-3">
                  <button
                    disabled={uploading}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {editingId ? "Update Coach" : "Add Coach"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-bold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Coaches</h2>
                  <p className="text-sm text-slate-500">
                    Current coach profiles visible to users.
                  </p>
                </div>

                <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold">
                  {coaches.length} coach(es)
                </span>
              </div>

              <div className="space-y-4">
                {coaches.length === 0 ? (
                  <p className="text-sm text-slate-500">No coaches yet.</p>
                ) : (
                  coaches.map((coach) => (
                    <div
                      key={coach.id}
                      className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex gap-4">
                        <img
                          src={coach.image_path || coach.image_url || FALLBACK_IMAGE}
                          alt={coach.name}
                          className="h-24 w-24 rounded-2xl object-cover"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />

                        <div>
                          <h3 className="text-lg font-black text-slate-950">
                            {coach.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {coach.specialty || "No specialty"}
                          </p>
                          <p className="mt-1 text-sm font-black text-blue-700">
                            {money(coach.rate_per_hour)} / hour
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Available: {cleanTime(coach.available_start_time)} -{" "}
                            {cleanTime(coach.available_end_time || "20:00")}
                          </p>
                          <p
                            className={`mt-1 text-xs font-bold ${
                              coach.is_active !== false
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {coach.is_active !== false ? "ACTIVE" : "INACTIVE"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(coach)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCoach(coach)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50"
                        >
                          {coach.is_active !== false ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}