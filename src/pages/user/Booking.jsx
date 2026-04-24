import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import ConnectionBanner from "../../components/layout/ConnectionBanner";
import Card from "../../components/ui/Card";
import { CardSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { addOfflineAction } from "../../services/syncService";
import {
  createBooking,
  getFacilities,
  getUserBookings,
  getApprovedBookingsByDate,
  cancelBooking,
} from "../../services/bookingService";
import {
  createCoachBooking,
  getCoaches,
  getApprovedCoachBookingsByDate,
} from "../../services/coachingService";

const FACILITY_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="34" fill="#64748b">Facility</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || FACILITY_FALLBACK;
}

function getFacilityImages(facility) {
  const images = [...(facility?.image_urls || []), facility?.image_url].filter(Boolean);
  return images.length ? [...new Set(images)] : [FACILITY_FALLBACK];
}

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

function getHoursBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60);
}

function generateTimeSlots(startHour = 8, endHour = 20) {
  return Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i;
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    return {
      label: `${formatTime(start)} - ${formatTime(end)}`,
      start_time: start,
      end_time: end,
    };
  });
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function getBlockedSlotIndexes(slots, approvedBookings) {
  const blockedIndexes = new Set();

  slots.forEach((slot, index) => {
    const blocked = approvedBookings.some((booking) =>
      rangesOverlap(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    if (blocked) blockedIndexes.add(index);
  });

  return blockedIndexes;
}

export default function Booking() {
  const { user } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [approvedFacilityBookings, setApprovedFacilityBookings] = useState([]);
  const [approvedCoachBookings, setApprovedCoachBookings] = useState([]);

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilityPreviewImage, setFacilityPreviewImage] = useState("");

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");

  const [form, setForm] = useState({
    facility_id: "",
    booking_date: "",
    start_time: "",
    end_time: "",
    session_type: "facility",
    notes: "",
    include_coach: false,
    coach_id: "",
    coach_session_mode: "one_on_one",
    coach_participants: 1,
  });

  const slots = useMemo(() => generateTimeSlots(8, 20), []);

  const facilityBlockedIndexes = useMemo(
    () => getBlockedSlotIndexes(slots, approvedFacilityBookings),
    [slots, approvedFacilityBookings]
  );

  const coachBlockedIndexes = useMemo(
    () => getBlockedSlotIndexes(slots, approvedCoachBookings),
    [slots, approvedCoachBookings]
  );

  const selectedCoach = useMemo(
    () => coaches.find((coach) => coach.id === form.coach_id) || null,
    [coaches, form.coach_id]
  );

  const totalHours = useMemo(
    () => getHoursBetween(form.start_time, form.end_time),
    [form.start_time, form.end_time]
  );

  const facilityRate = Number(selectedFacility?.price || 0);
  const coachRate = Number(selectedCoach?.rate_per_hour || 0);
  const facilityAmount = totalHours * facilityRate;
  const coachAmount = form.include_coach ? totalHours * coachRate : 0;
  const totalAmount = facilityAmount + coachAmount;

  useEffect(() => {
    if (user?.id) loadBaseData();
  }, [user?.id]);

  useEffect(() => {
    if (form.facility_id && form.booking_date) {
      loadApprovedFacilitySlots(form.facility_id, form.booking_date);
    } else {
      setApprovedFacilityBookings([]);
    }
  }, [form.facility_id, form.booking_date]);

  useEffect(() => {
    if (form.include_coach && form.coach_id && form.booking_date) {
      loadApprovedCoachSlots(form.coach_id, form.booking_date);
    } else {
      setApprovedCoachBookings([]);
    }
  }, [form.include_coach, form.coach_id, form.booking_date]);

  useEffect(() => {
    updateSelectedTimeRange();
  }, [
    selectedStartIndex,
    selectedEndIndex,
    facilityBlockedIndexes,
    coachBlockedIndexes,
    form.include_coach,
    form.coach_id,
  ]);

  async function loadBaseData() {
    try {
      setLoading(true);
      setError("");

      const [facilityData, coachData, bookingData] = await Promise.all([
        getFacilities(),
        getCoaches(),
        getUserBookings(user.id),
      ]);

      setFacilities(facilityData || []);
      setCoaches((coachData || []).filter((coach) => coach.is_active !== false));
      setBookings(bookingData || []);
    } catch (err) {
      setError(err.message || "Failed to load booking data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovedFacilitySlots(facilityId, bookingDate) {
    try {
      setSlotLoading(true);
      setError("");
      const data = await getApprovedBookingsByDate(facilityId, bookingDate);
      setApprovedFacilityBookings(data || []);
    } catch (err) {
      setError(err.message || "Failed to load facility availability.");
    } finally {
      setSlotLoading(false);
    }
  }

  async function loadApprovedCoachSlots(coachId, bookingDate) {
    try {
      setSlotLoading(true);
      setError("");
      const data = await getApprovedCoachBookingsByDate(coachId, bookingDate);
      setApprovedCoachBookings(data || []);
    } catch (err) {
      setError(err.message || "Failed to load coach availability.");
    } finally {
      setSlotLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
      ...(name === "booking_date" ||
      name === "facility_id" ||
      name === "coach_id" ||
      name === "include_coach"
        ? { start_time: "", end_time: "" }
        : {}),
      ...(name === "include_coach" && !checked
        ? {
            coach_id: "",
            coach_session_mode: "one_on_one",
            coach_participants: 1,
          }
        : {}),
    }));

    if (
      name === "booking_date" ||
      name === "facility_id" ||
      name === "coach_id" ||
      name === "include_coach"
    ) {
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setConflictWarning("");
    }
  }

  function chooseFacility(facility) {
    setSelectedFacility(facility);
    setForm((prev) => ({
      ...prev,
      facility_id: facility.id,
      start_time: "",
      end_time: "",
    }));
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setConflictWarning("");
    setShowFacilityModal(false);

    setTimeout(() => {
      document
        .getElementById("facility-booking-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openFacilityModal(facility) {
    setSelectedFacility(facility);
    setFacilityPreviewImage(getImageSrc(facility.image_url || getFacilityImages(facility)[0]));
    setShowFacilityModal(true);
  }

  function updateSelectedTimeRange() {
    if (selectedStartIndex === null || selectedEndIndex === null) {
      setForm((prev) => ({ ...prev, start_time: "", end_time: "" }));
      return;
    }

    const startIndex = Math.min(selectedStartIndex, selectedEndIndex);
    const endIndex = Math.max(selectedStartIndex, selectedEndIndex);
    const selectedSlots = slots.slice(startIndex, endIndex + 1);

    if (!selectedSlots.length) return;

    const hasFacilityConflict = selectedSlots.some((_, offset) =>
      facilityBlockedIndexes.has(startIndex + offset)
    );

    const hasCoachConflict =
      form.include_coach &&
      form.coach_id &&
      selectedSlots.some((_, offset) => coachBlockedIndexes.has(startIndex + offset));

    if (hasFacilityConflict) {
      setConflictWarning("Your selected range includes unavailable facility slots.");
      setForm((prev) => ({ ...prev, start_time: "", end_time: "" }));
      return;
    }

    if (hasCoachConflict) {
      setConflictWarning("Your selected range includes unavailable coach slots.");
      setForm((prev) => ({ ...prev, start_time: "", end_time: "" }));
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
    if (isSlotBlocked(index)) return;

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

  function isSlotBlocked(index) {
    const facilityBlocked = facilityBlockedIndexes.has(index);
    const coachBlocked =
      form.include_coach && form.coach_id && coachBlockedIndexes.has(index);

    return facilityBlocked || coachBlocked;
  }

  function getSlotBlockedReason(index) {
    const facilityBlocked = facilityBlockedIndexes.has(index);
    const coachBlocked =
      form.include_coach && form.coach_id && coachBlockedIndexes.has(index);

    if (facilityBlocked && coachBlocked) return "Facility + Coach unavailable";
    if (facilityBlocked) return "Facility unavailable";
    if (coachBlocked) return "Coach unavailable";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) return setError("You must be logged in.");
    if (!form.facility_id || !form.booking_date || !form.start_time || !form.end_time) {
      return setError("Please select facility, date, and time range.");
    }
    if (form.include_coach && !form.coach_id) {
      return setError("Please select a coach or turn off the coach booking option.");
    }
    if (totalHours <= 0) return setError("Please select a valid time range.");
    if (conflictWarning && navigator.onLine) {
      return setError("Please fix the selected time range first.");
    }

    const facilityPayload = {
      user_id: user.id,
      facility_id: form.facility_id,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      session_type: form.session_type,
      notes: form.notes,
      status: "pending",
      total_hours: totalHours,
      rate_per_hour: facilityRate,
      coach_rate_per_hour: form.include_coach ? coachRate : 0,
      total_amount: totalAmount,
      includes_coach: form.include_coach,
      linked_coach_id: form.include_coach ? form.coach_id : null,
    };

    const coachPayload = {
      user_id: user.id,
      coach_id: form.coach_id,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      session_mode: form.coach_session_mode,
      participants: Number(
        form.coach_session_mode === "one_on_one" ? 1 : form.coach_participants
      ),
      notes: `Booked together with facility: ${selectedFacility?.name || "Facility"}${
        form.notes ? ` | Notes: ${form.notes}` : ""
      }`,
      status: "pending",
      total_hours: totalHours,
      rate_per_hour: coachRate,
      total_amount: coachAmount,
    };

    try {
      setSubmitting(true);

      if (!navigator.onLine) {
        addOfflineAction({ type: "booking", payload: facilityPayload });

        if (form.include_coach) {
          addOfflineAction({ type: "coaching", payload: coachPayload });
        }

        setMessage("You are offline. Booking request saved and will sync automatically.");
      } else {
        await createBooking(facilityPayload);

        if (form.include_coach) await createCoachBooking(coachPayload);

        setMessage(
          form.include_coach
            ? `Facility and coach booking submitted. Total: ₱${totalAmount}`
            : `Facility booking submitted. Total: ₱${totalAmount}`
        );
      }

      setForm({
        facility_id: "",
        booking_date: "",
        start_time: "",
        end_time: "",
        session_type: "facility",
        notes: "",
        include_coach: false,
        coach_id: "",
        coach_session_mode: "one_on_one",
        coach_participants: 1,
      });

      setSelectedFacility(null);
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setApprovedFacilityBookings([]);
      setApprovedCoachBookings([]);
      setConflictWarning("");

      await loadBaseData();
    } catch (err) {
      setError(err.message || "Failed to submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  function openCancelModal(booking) {
    setCancelTarget(booking);
    setCancelReason("");
    setCancelModalOpen(true);
  }

  async function handleCancelBooking() {
    setError("");
    setMessage("");

    if (!cancelReason.trim()) {
      setError("Please enter a cancellation reason.");
      return;
    }

    try {
      setCancelling(true);
      await cancelBooking(cancelTarget.id, user.id, cancelReason.trim());
      setMessage("Booking cancelled successfully.");
      setCancelModalOpen(false);
      setCancelTarget(null);
      setCancelReason("");
      await loadBaseData();
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Facility Booking" />
          <ConnectionBanner />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">Direct Facility Booking</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Choose a facility, preview details, then book instantly.
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
              Tap a facility to view images, hourly rate, description, and booking options.
            </p>
          </div>

          <Card className="mb-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-black">Available Facilities</h3>
                <p className="mt-1 text-sm text-black">
                  Open a facility view or select a facility to continue booking.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-black">
                {selectedFacility ? (
                  <span>
                    Selected facility:{" "}
                    <span className="font-semibold">{selectedFacility.name}</span>
                  </span>
                ) : (
                  <span>No facility selected yet</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : facilities.length === 0 ? (
              <p className="text-black">No facilities available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className={`card-hover overflow-hidden rounded-3xl border bg-white transition ${
                      form.facility_id === facility.id
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openFacilityModal(facility)}
                      className="block w-full text-left"
                    >
                      <div className="h-56 bg-slate-100">
                        <img
                          src={getImageSrc(facility.image_url || getFacilityImages(facility)[0])}
                          alt={facility.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = FACILITY_FALLBACK;
                          }}
                        />
                      </div>

                      <div className="p-4">
                        <p className="break-words font-bold text-black">{facility.name}</p>
                        <p className="mt-1 break-words text-sm text-black">{facility.type}</p>
                        <p className="mt-2 text-sm font-semibold text-blue-700">
                          ₱ {facility.price || 0} / hour
                        </p>
                      </div>
                    </button>

                    <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                      <button
                        type="button"
                        onClick={() => openFacilityModal(facility)}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-50"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => chooseFacility(facility)}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {selectedFacility ? (
            <div
              id="facility-booking-panel"
              className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]"
            >
              <Card>
                <div className="overflow-hidden rounded-3xl bg-slate-100">
                  <img
                    src={getImageSrc(selectedFacility.image_url)}
                    alt={selectedFacility.name}
                    className="h-72 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FACILITY_FALLBACK;
                    }}
                  />
                </div>

                <h3 className="mt-5 break-words text-2xl font-bold text-black">
                  {selectedFacility.name}
                </h3>
                <p className="mt-2 break-words text-sm font-medium text-blue-700">
                  {selectedFacility.type}
                </p>
                <p className="mt-3 break-words text-sm leading-7 text-black">
                  {selectedFacility.description || "No description provided yet."}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-700">
                    Facility Rate
                  </p>
                  <p className="mt-1 break-words font-semibold text-black">
                    ₱ {facilityRate} / hour
                  </p>
                </div>
              </Card>

              <Card>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-black">
                    Book {selectedFacility.name}
                  </h3>
                  <p className="mt-1 text-sm text-black">
                    Select a date, optional coach, then highlight a continuous time range.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                    {message}
                  </div>
                )}

                {conflictWarning && (
                  <div className="mb-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    {conflictWarning}
                  </div>
                )}

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
                        Session Type
                      </label>
                      <select
                        name="session_type"
                        value={form.session_type}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                      >
                        <option value="facility">Facility</option>
                        <option value="training">Training</option>
                        <option value="practice">Practice</option>
                      </select>
                    </div>

                    <div className="lg:col-span-2 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
                      <label className="flex items-start gap-3 text-black">
                        <input
                          type="checkbox"
                          name="include_coach"
                          checked={form.include_coach}
                          onChange={handleChange}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-semibold">Book a coach with this facility</p>
                          <p className="mt-1 text-sm">
                            The same date and selected time range will be used for the coach booking.
                          </p>
                        </div>
                      </label>

                      {form.include_coach && (
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Coach
                            </label>
                            <select
                              name="coach_id"
                              value={form.coach_id}
                              onChange={handleChange}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                            >
                              <option value="">Select coach</option>
                              {coaches.map((coach) => (
                                <option key={coach.id} value={coach.id}>
                                  {coach.name} - {coach.specialty} - ₱
                                  {coach.rate_per_hour || 0}/hr
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-black">
                              Coach Session
                            </label>
                            <select
                              name="coach_session_mode"
                              value={form.coach_session_mode}
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
                              min="1"
                              name="coach_participants"
                              value={form.coach_participants}
                              onChange={handleChange}
                              disabled={form.coach_session_mode === "one_on_one"}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="rounded-2xl bg-white p-4 text-sm text-black">
                            {selectedCoach ? (
                              <>
                                <p className="font-semibold">{selectedCoach.name}</p>
                                <p className="mt-1">{selectedCoach.specialty}</p>
                                <p className="mt-2 font-semibold text-blue-700">
                                  ₱ {coachRate} / hour
                                </p>
                              </>
                            ) : (
                              <p>Select a coach to check availability and rate.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-2">
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
                      {slotLoading && (
                        <span className="text-sm text-black">Checking availability...</span>
                      )}
                    </div>

                    {!form.facility_id || !form.booking_date ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-black">
                        Select a facility and date first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {slots.map((slot, index) => {
                          const blocked = isSlotBlocked(index);
                          const selected = isSelectedRange(index);

                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              disabled={blocked}
                              title={getSlotBlockedReason(index)}
                              onClick={() => handleSlotClick(index)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                                blocked
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                  : selected
                                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.25)]"
                                  : "border-slate-200 bg-white text-black hover:-translate-y-0.5 hover:bg-blue-50"
                              }`}
                            >
                              <span>{slot.label}</span>
                              {blocked && (
                                <span className="mt-1 block text-[11px]">
                                  {getSlotBlockedReason(index)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-lg font-bold text-black">Payment Summary</h4>

                    <div className="mt-4 space-y-3 text-sm text-black">
                      <div className="flex justify-between gap-4">
                        <span>Selected Hours</span>
                        <span className="font-semibold">{totalHours} hour(s)</span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Facility Rate</span>
                        <span className="font-semibold">
                          ₱ {facilityRate} × {totalHours} hr = ₱ {facilityAmount}
                        </span>
                      </div>

                      {form.include_coach && (
                        <div className="flex justify-between gap-4">
                          <span>Coach Rate</span>
                          <span className="font-semibold">
                            ₱ {coachRate} × {totalHours} hr = ₱ {coachAmount}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                        <span className="font-bold">Total Amount</span>
                        <span className="font-bold text-blue-700">₱ {totalAmount}</span>
                      </div>
                    </div>
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
                      placeholder="Optional notes about your booking"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : form.include_coach
                      ? `Submit Facility + Coach Booking — ₱ ${totalAmount}`
                      : `Submit Facility Booking — ₱ ${totalAmount}`}
                  </button>
                </form>
              </Card>
            </div>
          ) : (
            <Card>
              <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                <h3 className="text-2xl font-bold text-black">Select a Facility First</h3>
                <p className="mt-2 text-sm text-black">
                  Open a facility profile or press Book to continue.
                </p>
              </div>
            </Card>
          )}

          <Card className="mt-6 flex min-h-[420px] flex-col">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-black">My Bookings</h3>
              <p className="mt-1 text-sm text-black">
                Your recent facility requests and approvals.
              </p>
            </div>

            {loading ? (
              <ListSkeleton />
            ) : bookings.length === 0 ? (
              <p className="text-black">No booking requests yet.</p>
            ) : (
              <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[55vh]">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="card-hover rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="safe-text font-semibold text-black">
                          {booking.facilities?.name || "Facility"}
                        </p>
                        <p className="mt-1 text-sm text-black">
                          {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                          {formatTime(booking.end_time)}
                        </p>

                        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-black">
                          <p>
                            Hours:{" "}
                            <span className="font-semibold">{booking.total_hours || 0}</span>
                          </p>
                          <p>
                            Facility Rate:{" "}
                            <span className="font-semibold">
                              ₱ {booking.rate_per_hour || 0}/hr
                            </span>
                          </p>
                          {booking.includes_coach && (
                            <p>
                              Coach Rate:{" "}
                              <span className="font-semibold">
                                ₱ {booking.coach_rate_per_hour || 0}/hr
                              </span>
                            </p>
                          )}
                          <p className="mt-1 font-bold text-blue-700">
                            Total Amount: ₱ {booking.total_amount || 0}
                          </p>
                        </div>

                        <p className="mt-2 text-sm">
                          Status:{" "}
                          <span
                            className={
                              booking.status === "approved"
                                ? "font-semibold text-green-600"
                                : booking.status === "rejected" ||
                                  booking.status === "cancelled"
                                ? "font-semibold text-red-600"
                                : "font-semibold text-orange-500"
                            }
                          >
                            {booking.status}
                          </span>
                        </p>

                        {booking.cancellation_reason && (
                          <p className="mt-2 text-sm text-red-600">
                            Reason: {booking.cancellation_reason}
                          </p>
                        )}
                      </div>

                      {booking.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => openCancelModal(booking)}
                          className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {showFacilityModal && selectedFacility && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Facility View</h2>

              <button
                onClick={() => setShowFacilityModal(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
              <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-4">
                <div className="flex max-h-[720px] flex-col gap-3 overflow-y-auto pr-1">
                  {getFacilityImages(selectedFacility).map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setFacilityPreviewImage(getImageSrc(img))}
                      className={`h-20 w-20 overflow-hidden rounded-xl border bg-slate-100 ${
                        facilityPreviewImage === getImageSrc(img)
                          ? "border-black"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={getImageSrc(img)}
                        alt={selectedFacility.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FACILITY_FALLBACK;
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="relative flex min-h-[560px] items-center justify-center rounded-2xl bg-[#f3f4f6]">
                  <img
                    src={facilityPreviewImage || getImageSrc(selectedFacility.image_url)}
                    alt={selectedFacility.name}
                    className="h-full max-h-[680px] w-full rounded-2xl object-contain p-6"
                    onError={(e) => {
                      e.currentTarget.src = FACILITY_FALLBACK;
                    }}
                  />
                </div>
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <h1 className="text-3xl font-bold text-black">{selectedFacility.name}</h1>
                <p className="mt-1 text-lg capitalize text-slate-600">
                  {selectedFacility.type}
                </p>

                <p className="mt-5 text-xl font-bold text-black">
                  ₱{Number(selectedFacility.price || 0).toLocaleString()} / hour
                </p>

                <p className="mt-5 text-sm leading-7 text-black">
                  {selectedFacility.description || "No facility description yet."}
                </p>

                <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-black">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span>Hourly Rate</span>
                    <span className="font-bold">
                      ₱{Number(selectedFacility.price || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 py-3">
                    <span>Status</span>
                    <span className="font-bold">
                      {selectedFacility.is_active === false ? "Unavailable" : "Available"}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3">
                    <span>Facility Type</span>
                    <span className="font-bold capitalize">
                      {selectedFacility.type || "Facility"}
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => chooseFacility(selectedFacility)}
                    className="w-full rounded-full bg-black px-6 py-5 text-base font-bold text-white transition hover:bg-slate-800"
                  >
                    Book This Facility
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFacilityModal(false)}
                    className="w-full rounded-full border border-slate-300 bg-white px-6 py-5 text-base font-bold text-black transition hover:border-black"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && cancelTarget && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-black">Cancel Booking</h2>
            <p className="mt-2 text-sm text-black">
              Please enter your reason for cancelling this pending booking.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-black">
              <p className="font-semibold">
                {cancelTarget.facilities?.name || "Facility Booking"}
              </p>
              <p className="mt-1">
                {cancelTarget.booking_date} • {formatTime(cancelTarget.start_time)} -{" "}
                {formatTime(cancelTarget.end_time)}
              </p>
            </div>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows="5"
              placeholder="Example: Change of schedule, emergency, wrong date..."
              className="mt-4 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}