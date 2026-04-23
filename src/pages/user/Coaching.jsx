import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import ConnectionBanner from "../../components/layout/ConnectionBanner";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { addOfflineAction } from "../../services/syncService";
import {
  createCoachBooking,
  getCoaches,
  getUserCoachBookings,
  getApprovedCoachBookingsByDate,
} from "../../services/coachingService";

const COACH_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="22" fill="#64748b">Coach</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || COACH_FALLBACK;
}

function generateTimeSlots(startHour = 8, endHour = 20) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;

    slots.push({
      label: `${formatTime(start)} - ${formatTime(end)}`,
      start_time: start,
      end_time: end,
    });
  }

  return slots;
}

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function getBlockedSlotIndexes(slots, approvedBookings) {
  const blockedIndexes = new Set();

  slots.forEach((slot, index) => {
    const blocked = approvedBookings.some((booking) =>
      rangesOverlap(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      )
    );
    if (blocked) blockedIndexes.add(index);
  });

  return blockedIndexes;
}

export default function Coaching() {
  const { user } = useAuth();

  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [showCoachModal, setShowCoachModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [form, setForm] = useState({
    coach_id: "",
    booking_date: "",
    start_time: "",
    end_time: "",
    session_mode: "one_on_one",
    participants: 1,
    notes: "",
  });

  const slots = useMemo(() => generateTimeSlots(8, 20), []);
  const blockedIndexes = useMemo(
    () => getBlockedSlotIndexes(slots, approvedBookings),
    [slots, approvedBookings]
  );

  useEffect(() => {
    if (user) loadBaseData();
  }, [user]);

  useEffect(() => {
    if (form.coach_id && form.booking_date) {
      loadApprovedSlots(form.coach_id, form.booking_date);
    } else {
      setApprovedBookings([]);
      setConflictWarning("");
    }
  }, [form.coach_id, form.booking_date]);

  useEffect(() => {
    updateSelectedTimeRange();
  }, [selectedStartIndex, selectedEndIndex]);

  async function loadBaseData() {
    try {
      setLoading(true);
      setError("");

      const [coachData, bookingData] = await Promise.all([
        getCoaches(),
        user ? getUserCoachBookings(user.id) : Promise.resolve([]),
      ]);

      setCoaches(coachData || []);
      setBookings(bookingData || []);
    } catch (err) {
      setError(err.message || "Failed to load coaching data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovedSlots(coachId, bookingDate) {
    try {
      setSlotLoading(true);
      setError("");
      const data = await getApprovedCoachBookingsByDate(coachId, bookingDate);
      setApprovedBookings(data || []);
    } catch (err) {
      setError(err.message || "Failed to load coach availability.");
    } finally {
      setSlotLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "coach_id" || name === "booking_date"
        ? { start_time: "", end_time: "" }
        : {}),
    }));

    if (name === "coach_id" || name === "booking_date") {
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setConflictWarning("");
    }
  }

  function openCoachModal(coach) {
    setSelectedCoach(coach);
    setShowCoachModal(true);
  }

  function chooseCoach(coach) {
    setSelectedCoach(coach);
    setForm((prev) => ({
      ...prev,
      coach_id: coach.id,
      start_time: "",
      end_time: "",
    }));
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setConflictWarning("");
    setShowCoachModal(false);

    setTimeout(() => {
      const bookingSection = document.getElementById("coach-booking-panel");
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }

  function updateSelectedTimeRange() {
    if (selectedStartIndex === null || selectedEndIndex === null) {
      setForm((prev) => ({
        ...prev,
        start_time: "",
        end_time: "",
      }));
      return;
    }

    const startIndex = Math.min(selectedStartIndex, selectedEndIndex);
    const endIndex = Math.max(selectedStartIndex, selectedEndIndex);
    const selectedSlots = slots.slice(startIndex, endIndex + 1);

    if (!selectedSlots.length) return;

    const hasConflict = selectedSlots.some((_, offset) =>
      blockedIndexes.has(startIndex + offset)
    );

    if (hasConflict) {
      setConflictWarning("Your selected time range includes unavailable coach slots.");
      setForm((prev) => ({
        ...prev,
        start_time: "",
        end_time: "",
      }));
      return;
    }

    setConflictWarning("");
    setForm((prev) => ({
      ...prev,
      start_time: selectedSlots[0].start_time,
      end_time: selectedSlots[selectedSlots.length - 1].end_time,
    }));
  }

  function handleSlotClick(index) {
    if (blockedIndexes.has(index)) return;

    if (selectedStartIndex === null) {
      setSelectedStartIndex(index);
      setSelectedEndIndex(index);
      return;
    }

    setSelectedEndIndex(index);
  }

  function isSelectedRange(index) {
    if (selectedStartIndex === null || selectedEndIndex === null) return false;
    const start = Math.min(selectedStartIndex, selectedEndIndex);
    const end = Math.max(selectedStartIndex, selectedEndIndex);
    return index >= start && index <= end;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!form.coach_id || !form.booking_date || !form.start_time || !form.end_time) {
      setError("Please select coach, date, and time range.");
      return;
    }

    if (conflictWarning && navigator.onLine) {
      setError("Please fix the selected time range first.");
      return;
    }

    const payload = {
      user_id: user.id,
      coach_id: form.coach_id,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      session_mode: form.session_mode,
      participants: Number(form.session_mode === "one_on_one" ? 1 : form.participants),
      notes: form.notes,
      status: "pending",
    };

    try {
      setSubmitting(true);

      if (!navigator.onLine) {
        addOfflineAction({
          type: "coaching",
          payload,
        });
        setMessage(
          "You are offline. Coaching request saved and will sync automatically once online."
        );
      } else {
        await createCoachBooking(payload);
        setMessage("Coaching request submitted successfully. Waiting for staff approval.");
      }

      setForm({
        coach_id: "",
        booking_date: "",
        start_time: "",
        end_time: "",
        session_mode: "one_on_one",
        participants: 1,
        notes: "",
      });
      setSelectedCoach(null);
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setApprovedBookings([]);
      setConflictWarning("");

      await loadBaseData();
    } catch (err) {
      setError(err.message || "Failed to submit coaching request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coaching" />
          <ConnectionBanner />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-violet-600 via-blue-700 to-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-100">
                  Direct Coach Booking
                </p>
                <h2 className="mt-2 break-words text-3xl font-bold tracking-tight md:text-4xl">
                  Choose a coach and view full details before booking.
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                  Tap any coach card to open the full profile, then continue straight to booking.
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-black">Available Coaches</h3>
                <p className="mt-1 text-sm text-black">
                  Browse coaches, open their profile, and select the right one for your session.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-black">
                {selectedCoach ? (
                  <span>
                    Selected coach: <span className="font-semibold">{selectedCoach.name}</span>
                  </span>
                ) : (
                  <span>No coach selected yet</span>
                )}
              </div>
            </div>

            {loading ? (
              <p className="text-black">Loading coaches...</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className={`overflow-hidden rounded-3xl border bg-white transition hover:-translate-y-1 hover:shadow-xl ${
                      form.coach_id === coach.id
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openCoachModal(coach)}
                      className="block w-full text-left"
                    >
                      <div className="h-56 bg-slate-100">
                        <img
                          src={getImageSrc(coach.image_url)}
                          alt={coach.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = COACH_FALLBACK;
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <p className="break-words font-bold text-black">{coach.name}</p>
                        <p className="mt-1 break-words text-sm text-black">
                          {coach.specialty}
                        </p>
                      </div>
                    </button>

                    <div className="px-4 pb-4">
                      <button
                        type="button"
                        onClick={() => chooseCoach(coach)}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Select Coach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {selectedCoach ? (
            <div
              id="coach-booking-panel"
              className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]"
            >
              <Card>
                <div className="overflow-hidden rounded-3xl bg-slate-100">
                  <img
                    src={getImageSrc(selectedCoach.image_url)}
                    alt={selectedCoach.name}
                    className="h-72 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = COACH_FALLBACK;
                    }}
                  />
                </div>

                <h3 className="mt-5 break-words text-2xl font-bold text-black">
                  {selectedCoach.name}
                </h3>
                <p className="mt-2 break-words text-sm font-medium text-blue-700">
                  {selectedCoach.specialty}
                </p>
                <p className="mt-3 break-words text-sm leading-7 text-black">
                  {selectedCoach.bio || "No bio provided yet."}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-700">
                    Experience
                  </p>
                  <p className="mt-1 break-words font-semibold text-black">
                    {selectedCoach.experience || "Not specified"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCoachModal(true)}
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-50"
                >
                  View Full Profile
                </button>
              </Card>

              <Card>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-black">
                    Book {selectedCoach.name}
                  </h3>
                  <p className="mt-1 text-sm text-black">
                    Choose a date, select session mode, then highlight a continuous time range.
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

                {conflictWarning ? (
                  <div className="mb-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    {conflictWarning}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black">
                        Date
                      </label>
                      <input
                        type="date"
                        name="booking_date"
                        value={form.booking_date}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black">
                        Session Mode
                      </label>
                      <select
                        name="session_mode"
                        value={form.session_mode}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                      >
                        <option value="one_on_one">One-on-One</option>
                        <option value="group">Group</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black">
                        Participants
                      </label>
                      <input
                        type="number"
                        name="participants"
                        min="1"
                        value={form.participants}
                        onChange={handleChange}
                        disabled={form.session_mode === "one_on_one"}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500 disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black">
                        Selected Range
                      </label>
                      <input
                        value={
                          form.start_time && form.end_time
                            ? `${formatTime(form.start_time)} - ${formatTime(form.end_time)}`
                            : ""
                        }
                        readOnly
                        placeholder="Choose from the slots below"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-black"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="block text-sm font-medium text-black">
                        Available Time Slots
                      </label>
                      {slotLoading ? (
                        <span className="text-sm text-black">Checking availability...</span>
                      ) : null}
                    </div>

                    {!form.coach_id || !form.booking_date ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-black">
                        Select a coach and date first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {slots.map((slot, index) => {
                          const blocked = blockedIndexes.has(index);
                          const selected = isSelectedRange(index);

                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              disabled={blocked}
                              onClick={() => handleSlotClick(index)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                                blocked
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                  : selected
                                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.25)]"
                                  : "border-slate-200 bg-white text-black hover:-translate-y-0.5 hover:bg-blue-50"
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-black">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows="4"
                      className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                      placeholder="Optional notes for the coach or staff"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Coaching Request"}
                  </button>
                </form>
              </Card>
            </div>
          ) : (
            <Card>
              <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <h3 className="text-2xl font-bold text-black">Select a Coach First</h3>
                <p className="mt-2 text-sm text-black">
                  Open a coach profile or press Select Coach to continue to booking.
                </p>
              </div>
            </Card>
          )}

          <Card className="mt-6 flex min-h-[420px] flex-col">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-black">My Coaching Requests</h3>
              <p className="mt-1 text-sm text-black">
                Your recent coach bookings and approvals.
              </p>
            </div>

            {loading ? (
              <p className="text-black">Loading coaching requests...</p>
            ) : bookings.length === 0 ? (
              <p className="text-black">No coaching requests yet.</p>
            ) : (
              <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[55vh]">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="safe-text font-semibold text-black">
                      {booking.coaches?.name || "Coach"}
                    </p>
                    <p className="mt-1 text-sm text-black">
                      {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                      {formatTime(booking.end_time)}
                    </p>
                    <p className="mt-1 text-sm capitalize text-black">
                      {booking.session_mode.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm">
                      Status:{" "}
                      <span
                        className={
                          booking.status === "approved"
                            ? "font-semibold text-green-600"
                            : booking.status === "rejected"
                            ? "font-semibold text-red-600"
                            : "font-semibold text-orange-500"
                        }
                      >
                        {booking.status}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {showCoachModal && selectedCoach ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600">Coach Profile</p>
                <h2 className="mt-1 text-2xl font-bold text-black">
                  {selectedCoach.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  {selectedCoach.specialty}
                </p>
              </div>

              <button
                onClick={() => setShowCoachModal(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <img
                src={getImageSrc(selectedCoach.image_url)}
                alt={selectedCoach.name}
                className="h-72 w-full rounded-2xl border object-cover"
                onError={(e) => {
                  e.currentTarget.src = COACH_FALLBACK;
                }}
              />

              <div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Experience
                  </p>
                  <p className="mt-1 text-base font-semibold text-black">
                    {selectedCoach.experience || "Not specified"}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-7 text-black">
                    {selectedCoach.bio || "No bio provided yet."}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => chooseCoach(selectedCoach)}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Choose This Coach
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCoachModal(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-50"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}