// src/pages/user/Coaching.jsx

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  createCoachBooking,
  cancelCoachBooking,
  getUserCoachBookings,
} from "../../services/coachingService";
import { useAuth } from "../../context/AuthContext";

const FALLBACK =
  "https://via.placeholder.com/400x400?text=Coach";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(time24) {
  if (!time24) return "";

  const [h, m] = String(time24).split(":");
  let hour = Number(h);

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function generateSlots() {
  return Array.from({ length: 12 }, (_, index) => {
    const startHour = 8 + index;
    const endHour = startHour + 1;

    return {
      start_time: `${String(startHour).padStart(2, "0")}:00`,
      end_time: `${String(endHour).padStart(2, "0")}:00`,
      label: `${formatTime(
        `${String(startHour).padStart(2, "0")}:00`
      )} - ${formatTime(
        `${String(endHour).padStart(2, "0")}:00`
      )}`,
    };
  });
}

export default function Coaching() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  const [selectedCoach, setSelectedCoach] = useState(null);

  const [approvedBookings, setApprovedBookings] = useState([]);

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [cancelModal, setCancelModal] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [form, setForm] = useState({
    booking_date: "",
    session_mode: "one_on_one",
    participants: 1,
    notes: "",
  });

  const slots = useMemo(() => generateSlots(), []);

  const selectedRange = useMemo(() => {
    if (selectedStartIndex === null || selectedEndIndex === null) return [];

    const start = Math.min(selectedStartIndex, selectedEndIndex);
    const end = Math.max(selectedStartIndex, selectedEndIndex);

    return slots.slice(start, end + 1);
  }, [selectedStartIndex, selectedEndIndex, slots]);

  const startTime = selectedRange[0]?.start_time || "";
  const endTime =
    selectedRange[selectedRange.length - 1]?.end_time || "";

  const totalHours = selectedRange.length;

  const coachRate = Number(selectedCoach?.rate_per_hour || 0);

  const totalAmount = coachRate * totalHours;

  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCoach?.id && form.booking_date) {
      loadCoachSchedule();
    }
  }, [selectedCoach?.id, form.booking_date]);

  useEffect(() => {
    const channel = supabase
      .channel(`coach-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => {
          loadInitialData();

          if (selectedCoach?.id && form.booking_date) {
            loadCoachSchedule();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCoach?.id, form.booking_date]);

  async function loadInitialData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: coachData } = await supabase
        .from("coaches")
        .select("*")
        .order("created_at", { ascending: false });

      setCoaches(
        (coachData || []).filter((coach) => coach.is_active !== false)
      );

      const bookingData = await getUserCoachBookings(user.id);

      setMyBookings(bookingData || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCoachSchedule() {
    const { data } = await supabase
      .from("coach_bookings")
      .select("*")
      .eq("coach_id", selectedCoach.id)
      .eq("booking_date", form.booking_date)
      .in("status", ["approved", "pending"]);

    setApprovedBookings(data || []);
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

  function isBlocked(slot) {
    return approvedBookings.some(
      (booking) =>
        slot.start_time < booking.end_time &&
        slot.end_time > booking.start_time
    );
  }

  function handleSlotClick(index) {
    if (isBlocked(slots[index])) return;

    if (selectedStartIndex === null) {
      setSelectedStartIndex(index);
      setSelectedEndIndex(index);
      return;
    }

    setSelectedEndIndex(index);
  }

  function isSelected(index) {
    if (selectedStartIndex === null || selectedEndIndex === null)
      return false;

    const start = Math.min(
      selectedStartIndex,
      selectedEndIndex
    );

    const end = Math.max(
      selectedStartIndex,
      selectedEndIndex
    );

    return index >= start && index <= end;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!selectedCoach) {
      return setError("Please select a coach.");
    }

    if (!form.booking_date) {
      return setError("Please select booking date.");
    }

    if (!startTime || !endTime) {
      return setError("Please select time slots.");
    }

    try {
      setLoading(true);

      await createCoachBooking({
        user_id: profile.id,
        coach_id: selectedCoach.id,
        booking_date: form.booking_date,
        start_time: startTime,
        end_time: endTime,
        session_mode: form.session_mode,
        participants: Number(form.participants || 1),
        notes: form.notes || "",
        total_hours: totalHours,
        rate_per_hour: coachRate,
        total_amount: totalAmount,
      });

      setMessage("Coach booking request submitted.");

      setForm({
        booking_date: "",
        session_mode: "one_on_one",
        participants: 1,
        notes: "",
      });

      setSelectedStartIndex(null);
      setSelectedEndIndex(null);

      await loadInitialData();
    } catch (err) {
      setError(err.message || "Failed to book coach.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelCoachBooking() {
    if (!selectedCancelBooking?.id) return;

    try {
      setCancelling(true);

      await cancelCoachBooking(
        selectedCancelBooking.id,
        cancelReason
      );

      setMessage("Coaching request cancelled.");

      setCancelModal(false);
      setSelectedCancelBooking(null);
      setCancelReason("");

      await loadInitialData();
    } catch (err) {
      setError(err.message || "Failed to cancel coaching request.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coaching Booking" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-green-700">
              {message}
            </div>
          )}

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Coaching Sessions</p>

            <h2 className="mt-2 text-3xl font-black">
              Book a coach session online.
            </h2>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {coaches.map((coach) => (
              <button
                key={coach.id}
                onClick={() => {
                  setSelectedCoach(coach);
                  setSelectedStartIndex(null);
                  setSelectedEndIndex(null);
                }}
                className={`overflow-hidden rounded-[30px] border bg-white text-left shadow-sm ${
                  selectedCoach?.id === coach.id
                    ? "border-[#C97B6C] ring-2 ring-[#D88E80]/40"
                    : "border-[#DED8D2]"
                }`}
              >
                <img
                  src={
                    coach.image_path ||
                    coach.image_url ||
                    FALLBACK
                  }
                  alt={coach.name}
                  className="h-64 w-full object-cover"
                />

                <div className="p-5">
                  <h3 className="text-2xl font-black">
                    {coach.name}
                  </h3>

                  <p className="mt-2 text-slate-500">
                    {coach.specialty || "Coach"}
                  </p>

                  <p className="mt-3 text-sm font-black text-[#C97B6C]">
                    {money(coach.rate_per_hour)} / hour
                  </p>
                </div>
              </button>
            ))}
          </section>

          {selectedCoach && (
            <section className="rounded-[30px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">
                Book {selectedCoach.name}
              </h3>

              <form onSubmit={handleSubmit} className="mt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Booking Date
                    </label>

                    <input
                      type="date"
                      name="booking_date"
                      min={getTodayDate()}
                      value={form.booking_date}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Session Mode
                    </label>

                    <select
                      name="session_mode"
                      value={form.session_mode}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                    >
                      <option value="one_on_one">
                        One-on-One
                      </option>

                      <option value="group">Group</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Participants
                    </label>

                    <input
                      type="number"
                      min="1"
                      name="participants"
                      value={form.participants}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                  {slots.map((slot, index) => {
                    const blocked = isBlocked(slot);
                    const selected = isSelected(index);

                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        disabled={blocked}
                        onClick={() => handleSlotClick(index)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                          blocked
                            ? "cursor-not-allowed bg-slate-100 text-slate-400"
                            : selected
                            ? "border-[#C97B6C] bg-[#C97B6C] text-white"
                            : "border-[#DED8D2] bg-white"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-5">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Coach Rate</span>

                      <b>{money(coachRate)} / hour</b>
                    </div>

                    <div className="flex justify-between">
                      <span>Total Hours</span>

                      <b>{totalHours}</b>
                    </div>

                    <div className="flex justify-between border-t border-[#DED8D2] pt-3 text-base">
                      <span className="font-black">
                        Total Amount
                      </span>

                      <b className="text-[#C97B6C]">
                        {money(totalAmount)}
                      </b>
                    </div>
                  </div>
                </div>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes"
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <button
                  disabled={loading}
                  className="mt-5 rounded-2xl bg-[#C97B6C] px-6 py-3 font-black text-white"
                >
                  {loading
                    ? "Submitting..."
                    : `Submit Coaching Request — ${money(
                        totalAmount
                      )}`}
                </button>
              </form>
            </section>
          )}

          <section className="mt-6 rounded-[30px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-black">
              My Coaching Requests
            </h3>

            <div className="mt-6 space-y-4">
              {myBookings.length === 0 ? (
                <p className="text-slate-500">
                  No coaching requests yet.
                </p>
              ) : (
                myBookings.map((booking) => {
                  const status = String(
                    booking.status || "pending"
                  ).toLowerCase();

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-[#DED8D2] p-5"
                    >
                      <h4 className="text-lg font-black">
                        {booking.coaches?.name || "Coach"}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {booking.booking_date} •{" "}
                        {booking.start_time} - {booking.end_time}
                      </p>

                      <p className="mt-2 text-sm capitalize">
                        Status: <b>{status}</b>
                      </p>

                      <p className="mt-2 text-sm font-black text-[#C97B6C]">
                        Total: {money(booking.total_amount)}
                      </p>

                      {status === "pending" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCancelBooking(booking);
                            setCancelModal(true);
                          }}
                          className="mt-4 rounded-2xl bg-[#C65B5B] px-5 py-3 text-sm font-bold text-white"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {cancelModal && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
                <h2 className="text-2xl font-black text-[#2B2B2B]">
                  Cancel Coaching Request
                </h2>

                <textarea
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(e.target.value)
                  }
                  placeholder="Reason for cancellation"
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModal(false);
                      setSelectedCancelBooking(null);
                      setCancelReason("");
                    }}
                    className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelCoachBooking}
                    disabled={cancelling}
                    className="rounded-2xl bg-[#C65B5B] px-5 py-3 font-bold text-white"
                  >
                    {cancelling
                      ? "Cancelling..."
                      : "Confirm Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
