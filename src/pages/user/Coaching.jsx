import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const COACH_FALLBACK = "https://via.placeholder.com/600x400?text=Coach";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

function formatTime(time24) {
  if (!time24) return "";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function generateSlots() {
  return Array.from({ length: 12 }, (_, index) => {
    const startHour = 8 + index;
    const endHour = startHour + 1;

    const start = `${String(startHour).padStart(2, "0")}:00`;
    const end = `${String(endHour).padStart(2, "0")}:00`;

    return {
      start_time: start,
      end_time: end,
      label: `${formatTime(start)} - ${formatTime(end)}`,
    };
  });
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = cleanTime(start).split(":").map(Number);
  const [eh, em] = cleanTime(end).split(":").map(Number);

  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
}

export default function Coaching() {
  const { user, profile: authProfile } = useAuth();
  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get("highlight");

  if (authProfile?.role === "staff") return <Navigate to="/staff" replace />;
  if (authProfile?.role === "admin") return <Navigate to="/admin" replace />;

  const [profile, setProfile] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [approvedCoachBookings, setApprovedCoachBookings] = useState([]);

  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [form, setForm] = useState({
    booking_date: "",
    session_mode: "one_on_one",
    participants: 1,
    notes: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slots = useMemo(() => generateSlots(), []);

  const selectedRange = useMemo(() => {
    if (selectedStartIndex === null || selectedEndIndex === null) return [];

    const start = Math.min(selectedStartIndex, selectedEndIndex);
    const end = Math.max(selectedStartIndex, selectedEndIndex);

    return slots.slice(start, end + 1);
  }, [selectedStartIndex, selectedEndIndex, slots]);

  const startTime = selectedRange[0]?.start_time || "";
  const endTime = selectedRange[selectedRange.length - 1]?.end_time || "";
  const totalHours = hoursBetween(startTime, endTime);
  const coachRate = Number(selectedCoach?.rate_per_hour || 0);
  const totalAmount = totalHours * coachRate;

  useEffect(() => {
    if (user?.id) loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    if (selectedCoach?.id && form.booking_date) {
      loadCoachBookings();
    } else {
      setApprovedCoachBookings([]);
    }
  }, [selectedCoach?.id, form.booking_date]);

  useEffect(() => {
    const channel = supabase
      .channel(`user-coaching-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaches" },
        () => loadInitialData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => {
          loadInitialData();
          if (selectedCoach?.id && form.booking_date) loadCoachBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedCoach?.id, form.booking_date]);

  async function loadInitialData() {
    try {
      setError("");

      if (!user?.id) return;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(
        profileData || {
          id: user.id,
          role: "user",
          full_name: user.email,
          email: user.email,
        }
      );

      const { data: coachesData, error: coachesError } = await supabase
        .from("coaches")
        .select("*")
        .order("created_at", { ascending: false });

      if (coachesError) throw coachesError;

      setCoaches(
        (coachesData || []).filter((coach) => coach.is_active !== false)
      );

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("coach_bookings")
        .select("*, coaches (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      setMyBookings(bookingsData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load coaching page.");
    }
  }

  async function loadCoachBookings() {
    if (!selectedCoach?.id || !form.booking_date) return;

    const { data, error } = await supabase
      .from("coach_bookings")
      .select("*")
      .eq("coach_id", selectedCoach.id)
      .eq("booking_date", form.booking_date)
      .in("status", ["pending", "approved"]);

    if (!error) setApprovedCoachBookings(data || []);
  }

  function handleCoachSelect(coach) {
    setSelectedCoach(coach);
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setError("");
    setMessage("");
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "booking_date") {
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
    }
  }

  function isSlotBlocked(slot) {
    if (!selectedCoach) return true;

    const coachStart = cleanTime(selectedCoach.available_start_time || "08:00");
    const coachEnd = cleanTime(selectedCoach.available_end_time || "20:00");

    const outsideWorkingHours =
      cleanTime(slot.start_time) < coachStart || cleanTime(slot.end_time) > coachEnd;

    const alreadyBooked = approvedCoachBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    return outsideWorkingHours || alreadyBooked;
  }

  function getSlotLabel(slot) {
    if (!selectedCoach) return "Select coach first";

    const coachStart = cleanTime(selectedCoach.available_start_time || "08:00");
    const coachEnd = cleanTime(selectedCoach.available_end_time || "20:00");

    if (cleanTime(slot.start_time) < coachStart || cleanTime(slot.end_time) > coachEnd) {
      return "Coach unavailable";
    }

    const booked = approvedCoachBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    if (booked) return "Already booked";

    return "Available";
  }

  function handleSlotClick(index) {
    if (isSlotBlocked(slots[index])) return;

    if (selectedStartIndex === null) {
      setSelectedStartIndex(index);
      setSelectedEndIndex(index);
      return;
    }

    setSelectedEndIndex(index);
  }

  function isSlotSelected(index) {
    if (selectedStartIndex === null || selectedEndIndex === null) return false;

    const start = Math.min(selectedStartIndex, selectedEndIndex);
    const end = Math.max(selectedStartIndex, selectedEndIndex);

    return index >= start && index <= end;
  }

  async function notifyStaffAndAdmin(bookingId) {
    const { data: receivers } = await supabase
      .from("profiles")
      .select("id, role")
      .in("role", ["staff", "admin"]);

    if (!receivers?.length) return;

    await Promise.all(
      receivers.map((person) =>
        supabase.rpc("create_notification_rpc", {
          p_user_id: person.id,
          p_target_role: person.role,
          p_title: "New Coaching Request",
          p_message: "A user submitted a coaching session request.",
          p_type: "coaching_request",
          p_reference_id: bookingId || null,
        })
      )
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!profile?.id) return setError("Please login first.");
    if (!selectedCoach) return setError("Please select a coach.");
    if (!form.booking_date) return setError("Please select a date.");
    if (!startTime || !endTime) return setError("Please select time slots.");

    const hasBlocked = selectedRange.some((slot) => isSlotBlocked(slot));

    if (hasBlocked) {
      return setError("Selected range includes unavailable coach time.");
    }

    try {
      setSubmitting(true);

      const payload = {
        user_id: profile.id,
        coach_id: selectedCoach.id,
        booking_date: form.booking_date,
        start_time: startTime,
        end_time: endTime,
        session_mode: form.session_mode,
        participants: Number(form.participants || 1),
        notes: form.notes || "",
        status: "pending",
        total_hours: totalHours,
        rate_per_hour: coachRate,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from("coach_bookings")
        .insert([payload])
        .select()
        .maybeSingle();

      if (insertError) throw insertError;

      await notifyStaffAndAdmin(data?.id);

      setMessage("Coaching request submitted successfully. Staff and admin were notified.");

      setSelectedStartIndex(null);
      setSelectedEndIndex(null);

      setForm({
        booking_date: "",
        session_mode: "one_on_one",
        participants: 1,
        notes: "",
      });

      await loadInitialData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit coaching request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coaching" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          <section className="mb-6 rounded-[28px] bg-gradient-to-br from-blue-600 to-slate-900 p-8 text-white">
            <p className="text-sm font-semibold">Direct Coaching Booking</p>
            <h2 className="mt-2 text-3xl font-black">
              Choose a coach, check availability, then book your session.
            </h2>
            <p className="mt-2 text-sm text-blue-50">
              Coach price and available time are managed by staff.
            </p>
          </section>

          <section className="mb-6 rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">Available Coaches</h3>
                <p className="text-sm text-slate-500">
                  Browse coaches, open their profile, and select the right one for your session.
                </p>
              </div>

              <span className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {selectedCoach ? `Selected coach: ${selectedCoach.name}` : "No coach selected yet"}
              </span>
            </div>

            {coaches.length === 0 ? (
              <p className="text-sm text-slate-500">No coaches available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className={`overflow-hidden rounded-3xl border bg-white ${
                      selectedCoach?.id === coach.id
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={coach.image_path || coach.image_url || COACH_FALLBACK}
                      alt={coach.name}
                      className="h-56 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = COACH_FALLBACK;
                      }}
                    />

                    <div className="p-4">
                      <h4 className="text-lg font-black">{coach.name}</h4>

                      <p className="text-sm text-slate-500">
                        {coach.specialty || "Coach"}
                      </p>

                      <p className="mt-2 text-sm font-black text-blue-700">
                        {money(coach.rate_per_hour)} / hour
                      </p>

                      <p className="text-xs text-slate-500">
                        Available: {cleanTime(coach.available_start_time)} -{" "}
                        {cleanTime(coach.available_end_time || "20:00")}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleCoachSelect(coach)}
                        className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                      >
                        Select Coach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedCoach && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
              <aside className="rounded-[28px] bg-white p-6 shadow-sm">
                <img
                  src={selectedCoach.image_path || selectedCoach.image_url || COACH_FALLBACK}
                  alt={selectedCoach.name}
                  className="h-72 w-full rounded-3xl object-cover"
                  onError={(e) => {
                    e.currentTarget.src = COACH_FALLBACK;
                  }}
                />

                <h3 className="mt-5 text-2xl font-black">{selectedCoach.name}</h3>

                <p className="mt-1 text-blue-700">
                  {selectedCoach.specialty || "Coach"}
                </p>

                <p className="mt-3 text-sm leading-7">
                  {selectedCoach.description || "No description provided."}
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Experience</p>
                  <p className="font-bold">
                    {selectedCoach.experience || "Not specified"}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Coach Rate</p>
                  <p className="font-black text-blue-700">
                    {money(coachRate)} / hour
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">
                    Available Time
                  </p>
                  <p className="font-bold">
                    {cleanTime(selectedCoach.available_start_time)} -{" "}
                    {cleanTime(selectedCoach.available_end_time || "20:00")}
                  </p>
                </div>
              </aside>

              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">
                  Book {selectedCoach.name}
                </h3>

                <p className="text-sm text-slate-500">
                  Choose a date, select session mode, then highlight a continuous time range.
                </p>

                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Date
                      </label>
                      <input
                        type="date"
                        name="booking_date"
                        value={form.booking_date}
                        onChange={handleChange}
                        className="w-full rounded-2xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Session Mode
                      </label>
                      <select
                        name="session_mode"
                        value={form.session_mode}
                        onChange={handleChange}
                        className="w-full rounded-2xl border px-4 py-3"
                      >
                        <option value="one_on_one">One-on-One</option>
                        <option value="group">Group</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Participants
                      </label>
                      <input
                        type="number"
                        min="1"
                        name="participants"
                        value={form.participants}
                        onChange={handleChange}
                        className="w-full rounded-2xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Selected Range
                      </label>
                      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-slate-500">
                        {startTime && endTime
                          ? `${formatTime(startTime)} - ${formatTime(endTime)}`
                          : "Choose from the slots below"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-lg font-black">Available Time Slots</h4>
                    <p className="text-sm text-slate-500">
                      Unavailable slots are disabled automatically.
                    </p>

                    {!form.booking_date ? (
                      <div className="mt-4 rounded-2xl border border-dashed p-6">
                        Select a coach and date first.
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
                        {slots.map((slot, index) => {
                          const blocked = isSlotBlocked(slot);
                          const selected = isSlotSelected(index);

                          return (
                            <button
                              type="button"
                              key={slot.start_time}
                              disabled={blocked}
                              onClick={() => handleSlotClick(index)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                blocked
                                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                  : selected
                                  ? "bg-blue-600 text-white"
                                  : "bg-white hover:bg-blue-50"
                              }`}
                            >
                              <span>{slot.label}</span>
                              <span className="mt-1 block text-xs">
                                {blocked ? getSlotLabel(slot) : "Available"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 rounded-3xl border bg-slate-50 p-5">
                    <h4 className="text-lg font-black">Payment Summary</h4>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Selected Hours</span>
                        <b>{totalHours} hour(s)</b>
                      </div>

                      <div className="flex justify-between">
                        <span>Coach Rate</span>
                        <b>
                          {money(coachRate)} × {totalHours} hr ={" "}
                          {money(totalAmount)}
                        </b>
                      </div>

                      <div className="flex justify-between border-t pt-3 text-base">
                        <span className="font-black">Total Amount</span>
                        <b className="text-blue-700">{money(totalAmount)}</b>
                      </div>
                    </div>
                  </div>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Optional notes for the coach or staff"
                    className="mt-5 min-h-[120px] w-full rounded-2xl border px-4 py-3"
                  />

                  <button
                    disabled={submitting}
                    className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : `Submit Coaching Request — ${money(totalAmount)}`}
                  </button>
                </form>
              </section>
            </div>
          )}

          <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black">My Coaching Requests</h3>

            {myBookings.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No coaching requests yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {myBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`rounded-2xl border p-4 ${
                      booking.id === highlightId
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <h4 className="font-bold">
                      {booking.coaches?.name || "Coach Session"}
                    </h4>

                    <p className="text-sm text-slate-500">
                      {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                      {formatTime(booking.end_time)}
                    </p>

                    <p className="mt-1 text-sm capitalize">
                      Mode: <b>{booking.session_mode || "one_on_one"}</b>
                    </p>

                    <p className="mt-1 text-sm capitalize">
                      Status: <b>{booking.status}</b>
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      Total: {money(booking.total_amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}