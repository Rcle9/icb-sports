import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

const COACH_FALLBACK = "https://via.placeholder.com/400x400?text=Coach";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

export default function CoachDashboard() {
  const [user, setUser] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    description: "",
    experience: "",
    rate_per_hour: 0,
    available_start_time: "08:00",
    available_end_time: "20:00",
    image_url: "",
    is_active: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => normalizeStatus(b.status) === "pending").length,
      approved: bookings.filter((b) => normalizeStatus(b.status) === "approved").length,
      rejected: bookings.filter((b) => normalizeStatus(b.status) === "rejected").length,
      cancelled: bookings.filter((b) => normalizeStatus(b.status) === "cancelled").length,
    };
  }, [bookings]);

  useEffect(() => {
    loadCoachData();

    const channel = supabase
      .channel(`coach-dashboard-bookings-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => loadCoachData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadCoachData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadCoachData() {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: coachData, error: coachError } = await supabase
        .from("coaches")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (coachError) throw coachError;

      if (coachData) {
        setCoachProfile(coachData);

        setForm({
          name: coachData.name || profileData?.full_name || user.email || "",
          specialty: coachData.specialty || "",
          description: coachData.description || "",
          experience: coachData.experience || "",
          rate_per_hour: coachData.rate_per_hour || 0,
          available_start_time: cleanTime(coachData.available_start_time || "08:00"),
          available_end_time: cleanTime(coachData.available_end_time || "20:00"),
          image_url: coachData.image_url || coachData.image_path || "",
          is_active: coachData.is_active !== false,
        });

        await loadBookings(coachData.id);
      } else {
        setCoachProfile(null);
        setForm((prev) => ({
          ...prev,
          name: profileData?.full_name || user.email || "",
        }));
        setBookings([]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load coach dashboard.");
    }
  }

  async function loadBookings(coachId) {
    const { data, error } = await supabase
      .from("coach_bookings")
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          role
        )
      `)
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setBookings(data || []);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function uploadImage() {
    if (!imageFile || !user?.id) return form.image_url || "";

    const ext = imageFile.name.split(".").pop();
    const filePath = `coach-${user.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("coach-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("coach-images").getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!user?.id) throw new Error("User not found.");

      const imageUrl = await uploadImage();

      const payload = {
        user_id: user.id,
        name: form.name,
        specialty: form.specialty,
        description: form.description,
        experience: form.experience,
        rate_per_hour: Number(form.rate_per_hour || 0),
        available_start_time: form.available_start_time,
        available_end_time: form.available_end_time,
        image_url: imageUrl,
        is_active: form.is_active,
      };

      let saved;

      if (coachProfile?.id) {
        const { data, error } = await supabase
          .from("coaches")
          .update(payload)
          .eq("id", coachProfile.id)
          .select("*")
          .single();

        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("coaches")
          .insert([payload])
          .select("*")
          .single();

        if (error) throw error;
        saved = data;
      }

      setCoachProfile(saved);
      setImageFile(null);
      setMessage("Coach profile saved successfully.");

      await loadBookings(saved.id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save coach profile.");
    } finally {
      setSaving(false);
    }
  }

  async function approveBooking(id) {
    try {
      setError("");
      setMessage("");

      if (!coachProfile?.id) throw new Error("Save your coach profile first.");

      const { data, error } = await supabase
        .from("coach_bookings")
        .update({ status: "approved" })
        .eq("id", id)
        .eq("coach_id", coachProfile.id)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This request is no longer pending.");

      if (data.facility_booking_id) {
        const { data: facilityBooking, error: facilityFetchError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", data.facility_booking_id)
          .maybeSingle();

        if (facilityFetchError) throw facilityFetchError;

        const finalStatus =
          facilityBooking?.facility_approval_status === "approved"
            ? "approved"
            : "pending";

        const { error: updateFacilityError } = await supabase
          .from("bookings")
          .update({
            coach_approval_status: "approved",
            status: finalStatus,
          })
          .eq("id", data.facility_booking_id);

        if (updateFacilityError) throw updateFacilityError;
      }

      if (data.user_id) {
        await supabase.rpc("create_notification_rpc", {
          p_user_id: data.user_id,
          p_target_role: "user",
          p_title: "Coaching Approved",
          p_message: "Your coaching booking has been approved by your coach.",
          p_type: "coaching_update",
          p_reference_id: data.id,
        });
      }

      setMessage("Coaching request approved.");
      await loadBookings(coachProfile.id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to approve request.");
    }
  }

  async function rejectBooking(id) {
    try {
      setError("");
      setMessage("");

      if (!coachProfile?.id) throw new Error("Save your coach profile first.");

      const { data, error } = await supabase
        .from("coach_bookings")
        .update({ status: "rejected" })
        .eq("id", id)
        .eq("coach_id", coachProfile.id)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This request is no longer pending.");

      if (data.facility_booking_id) {
        const { error: updateFacilityError } = await supabase
          .from("bookings")
          .update({
            coach_approval_status: "rejected",
            status: "rejected",
          })
          .eq("id", data.facility_booking_id);

        if (updateFacilityError) throw updateFacilityError;
      }

      if (data.user_id) {
        await supabase.rpc("create_notification_rpc", {
          p_user_id: data.user_id,
          p_target_role: "user",
          p_title: "Coaching Rejected",
          p_message: "Your coaching booking has been rejected by your coach.",
          p_type: "coaching_update",
          p_reference_id: data.id,
        });
      }

      setMessage("Coaching request rejected.");
      await loadBookings(coachProfile.id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reject request.");
    }
  }

  function statusClass(status) {
    const value = normalizeStatus(status);

    if (value === "approved") return "bg-green-100 text-green-700";
    if (value === "rejected") return "bg-red-100 text-red-700";
    if (value === "cancelled") return "bg-slate-200 text-slate-700";
    return "bg-yellow-100 text-yellow-700";
  }

  return (
    <div className="page-shell">
      <Sidebar role="coach" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coach Dashboard" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Coach Control Center</p>
            <h2 className="mt-2 text-3xl font-black">
              Manage your profile and coaching requests.
            </h2>
            <p className="mt-2 text-sm text-white/90">
              Combined facility + coach bookings only become approved when both staff and coach approve.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard title="Total Requests" value={stats.total} />
            <StatCard title="Pending" value={stats.pending} color="#D9A441" />
            <StatCard title="Approved" value={stats.approved} color="#168A7A" />
            <StatCard title="Rejected" value={stats.rejected} color="#C65B5B" />
            <StatCard title="Cancelled" value={stats.cancelled} color="#64748B" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                My Coach Profile
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                This profile is shown to users in the booking page.
              </p>

              <div className="mt-6 flex justify-center">
                <img
                  src={
                    imageFile
                      ? URL.createObjectURL(imageFile)
                      : form.image_url || COACH_FALLBACK
                  }
                  alt="Coach"
                  className="h-40 w-40 rounded-3xl object-cover"
                  onError={(e) => {
                    e.currentTarget.src = COACH_FALLBACK;
                  }}
                />
              </div>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Coach Name"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <input
                  name="specialty"
                  value={form.specialty}
                  onChange={handleChange}
                  placeholder="Specialty / Sport"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <input
                  type="number"
                  name="rate_per_hour"
                  value={form.rate_per_hour}
                  onChange={handleChange}
                  placeholder="Rate per hour"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Coach description"
                  className="min-h-[100px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <input
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="Experience"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
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
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
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
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
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
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl bg-[#F5F3F1] px-4 py-3 font-bold">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  Active Coach
                </label>

                <button
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#C97B6C] px-5 py-4 font-black text-white hover:bg-[#B87463] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Coach Profile"}
                </button>
              </form>
            </div>

            <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Coaching Booking Requests
              </h3>

              <p className="text-sm text-slate-500">
                Approve or reject bookings assigned to your coach profile.
              </p>

              {!coachProfile ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-slate-500">
                  Save your coach profile first to receive coaching bookings.
                </div>
              ) : bookings.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-slate-500">
                  No coaching booking requests yet.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {bookings.map((booking) => {
                    const status = normalizeStatus(booking.status);

                    return (
                      <div
                        key={booking.id}
                        className="rounded-2xl border border-[#DED8D2] p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>

                            <h4 className="mt-3 text-lg font-black text-[#2B2B2B]">
                              {booking.profiles?.full_name || "User Booking"}
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              {booking.booking_date} •{" "}
                              {cleanTime(booking.start_time)} -{" "}
                              {cleanTime(booking.end_time)}
                            </p>

                            <p className="mt-2 text-sm">
                              Mode:{" "}
                              <b className="capitalize">
                                {String(booking.session_mode || "one_on_one").replace(
                                  "_",
                                  " "
                                )}
                              </b>
                            </p>

                            <p className="text-sm">
                              Participants: <b>{booking.participants || 1}</b>
                            </p>

                            <p className="text-sm">Notes: {booking.notes || "-"}</p>

                            {booking.facility_booking_id && (
                              <p className="mt-2 text-sm font-semibold text-[#C97B6C]">
                                Linked Facility Booking: {booking.facility_booking_id}
                              </p>
                            )}

                            {status === "cancelled" &&
                              booking.cancellation_reason && (
                                <p className="mt-2 text-sm text-slate-500">
                                  Cancellation reason:{" "}
                                  {booking.cancellation_reason}
                                </p>
                              )}

                            <p className="mt-3 text-sm font-black">
                              Total: {money(booking.total_amount)}
                            </p>
                          </div>

                          <div>
                            {status === "pending" ? (
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => approveBooking(booking.id)}
                                  className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() => rejectBooking(booking.id)}
                                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-slate-500">
                                {status === "cancelled"
                                  ? "Cancelled by user"
                                  : "Reviewed"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "#2B2B2B" }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black" style={{ color }}>
        {value}
      </h3>
    </div>
  );
}