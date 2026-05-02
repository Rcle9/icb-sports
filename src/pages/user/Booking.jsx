import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { createBooking } from "../../services/bookingService";
import { useAuth } from "../../context/AuthContext";

const FACILITY_FALLBACK = "https://via.placeholder.com/800x500?text=Facility";
const COACH_FALLBACK = "https://via.placeholder.com/300x300?text=Coach";

const SESSION_TYPES = [
  { value: "training", label: "Training" },
  { value: "instructional", label: "Instructional" },
  { value: "recreational", label: "Recreational" },
];

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getFacilityImages(item) {
  const images = [
    ...(Array.isArray(item?.image_urls) ? item.image_urls : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    item?.image_url,
    item?.image,
  ].filter(Boolean);

  const unique = [...new Set(images)];
  return unique.length ? unique : [FACILITY_FALLBACK];
}

function formatTime(time24) {
  if (!time24) return "";

  const [h, m] = time24.split(":");
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

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export default function Booking() {
  const { user, profile: authProfile } = useAuth();
  const location = useLocation();

  const highlightId = new URLSearchParams(location.search).get("highlight");

  if (authProfile?.role === "staff") return <Navigate to="/staff" replace />;
  if (authProfile?.role === "admin") return <Navigate to="/admin" replace />;

  const [profile, setProfile] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedImage, setSelectedImage] = useState(FACILITY_FALLBACK);

  const [approvedBookings, setApprovedBookings] = useState([]);
  const [approvedCoachBookings, setApprovedCoachBookings] = useState([]);

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [form, setForm] = useState({
    booking_date: "",
    session_type: "training",
    include_coach: false,
    coach_id: "",
    coach_session_mode: "one_on_one",
    coach_participants: 1,
    notes: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slots = useMemo(() => generateSlots(), []);

  const selectedCoach = useMemo(
    () => coaches.find((coach) => coach.id === form.coach_id) || null,
    [coaches, form.coach_id]
  );

  const selectedRange = useMemo(() => {
    if (selectedStartIndex === null || selectedEndIndex === null) return [];

    const start = Math.min(selectedStartIndex, selectedEndIndex);
    const end = Math.max(selectedStartIndex, selectedEndIndex);

    return slots.slice(start, end + 1);
  }, [selectedStartIndex, selectedEndIndex, slots]);

  const startTime = selectedRange[0]?.start_time || "";
  const endTime = selectedRange[selectedRange.length - 1]?.end_time || "";

  const totalHours = hoursBetween(startTime, endTime);

  const facilityRate = Number(
    selectedFacility?.price_per_hour || selectedFacility?.price || 0
  );

  const coachRate = Number(selectedCoach?.rate_per_hour || 0);

  const facilityTotal = totalHours * facilityRate;
  const coachTotal = form.include_coach ? totalHours * coachRate : 0;
  const totalAmount = facilityTotal + coachTotal;

  useEffect(() => {
    if (user?.id) loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    if (selectedFacility?.id && form.booking_date) {
      loadApprovedBookings();
    } else {
      setApprovedBookings([]);
    }
  }, [selectedFacility?.id, form.booking_date]);

  useEffect(() => {
    if (form.include_coach && form.coach_id && form.booking_date) {
      loadApprovedCoachBookings();
    } else {
      setApprovedCoachBookings([]);
    }
  }, [form.include_coach, form.coach_id, form.booking_date]);

  useEffect(() => {
    const channel = supabase
      .channel(`booking-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          if (user?.id) loadInitialData();
          if (selectedFacility?.id && form.booking_date) loadApprovedBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => {
          if (form.include_coach && form.coach_id && form.booking_date) {
            loadApprovedCoachBookings();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          if (user?.id) loadInitialData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaches" },
        () => {
          if (user?.id) loadInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    user?.id,
    selectedFacility?.id,
    form.booking_date,
    form.include_coach,
    form.coach_id,
  ]);

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

      const currentProfile = profileData || {
        id: user.id,
        role: "user",
        full_name: user.email,
        email: user.email,
      };

      setProfile(currentProfile);

      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (facilitiesError) throw facilitiesError;

      const visibleFacilities = (facilitiesData || []).filter((facility) => {
        if (facility.is_active === false) return false;

        if (
          facility.status &&
          !["active", "available", "Active", "Available"].includes(
            facility.status
          )
        ) {
          return false;
        }

        return true;
      });

      setFacilities(visibleFacilities);

      const { data: coachesData, error: coachesError } = await supabase
        .from("coaches")
        .select("*")
        .order("created_at", { ascending: false });

      if (coachesError) throw coachesError;

      setCoaches(
        (coachesData || []).filter((coach) => coach.is_active !== false)
      );

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*, facilities (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookingError) throw bookingError;

      setBookings(bookingData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking page.");
    }
  }

  async function loadApprovedBookings() {
    if (!selectedFacility?.id || !form.booking_date) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("facility_id", selectedFacility.id)
      .eq("booking_date", form.booking_date)
      .in("status", ["approved", "pending"]);

    if (!error) setApprovedBookings(data || []);
  }

  async function loadApprovedCoachBookings() {
    if (!form.coach_id || !form.booking_date) return;

    const { data, error } = await supabase
      .from("coach_bookings")
      .select("*")
      .eq("coach_id", form.coach_id)
      .eq("booking_date", form.booking_date)
      .in("status", ["approved", "pending"]);

    if (!error) setApprovedCoachBookings(data || []);
  }

  function handleFacilitySelect(facility) {
    setSelectedFacility(facility);
    setSelectedImage(getFacilityImages(facility)[0]);
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setError("");
    setMessage("");
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "include_coach" && !checked
        ? {
            coach_id: "",
            coach_session_mode: "one_on_one",
            coach_participants: 1,
          }
        : {}),
    }));

    if (["booking_date", "coach_id", "include_coach"].includes(name)) {
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
    }
  }

  function isSlotBlocked(slot) {
    const facilityBlocked = approvedBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    let coachOutsideWorkingHours = false;

    if (form.include_coach && selectedCoach) {
      const coachStart = selectedCoach.available_start_time || "08:00";
      const coachEnd = selectedCoach.available_end_time || "20:00";

      coachOutsideWorkingHours =
        slot.start_time < coachStart || slot.end_time > coachEnd;
    }

    const coachAlreadyBooked =
      form.include_coach &&
      form.coach_id &&
      approvedCoachBookings.some((booking) =>
        overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
      );

    return facilityBlocked || coachOutsideWorkingHours || coachAlreadyBooked;
  }

  function getSlotLabel(slot) {
    if (!form.include_coach || !selectedCoach) return "Available";

    const coachStart = selectedCoach.available_start_time || "08:00";
    const coachEnd = selectedCoach.available_end_time || "20:00";

    if (slot.start_time < coachStart || slot.end_time > coachEnd) {
      return "Coach unavailable";
    }

    const coachBooked = approvedCoachBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    if (coachBooked) return "Coach booked";

    const facilityBooked = approvedBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );

    if (facilityBooked) return "Facility booked";

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

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!profile?.id) return setError("Please login first.");
    if (!selectedFacility) return setError("Please select a facility.");
    if (!form.booking_date) return setError("Please select a booking date.");
    if (!startTime || !endTime) return setError("Please select time slots.");

    if (form.include_coach && !form.coach_id) {
      return setError("Please select a coach.");
    }

    const selectedHasBlockedSlot = selectedRange.some((slot) =>
      isSlotBlocked(slot)
    );

    if (selectedHasBlockedSlot) {
      return setError("Selected time includes unavailable slots.");
    }

    try {
      setSubmitting(true);

      await createBooking({
        user_id: profile.id,
        facility_id: selectedFacility.id,
        booking_date: form.booking_date,
        start_time: startTime,
        end_time: endTime,
        session_type: form.session_type,
        notes: form.notes || "",

        total_hours: totalHours,
        rate_per_hour: facilityRate,
        total_amount: totalAmount,

        includes_coach: form.include_coach,
        linked_coach_id: form.include_coach ? form.coach_id : null,
        coach_rate_per_hour: form.include_coach ? coachRate : 0,
        coach_session_mode: form.coach_session_mode,
        coach_participants: form.coach_participants,
      });

      setMessage("Booking submitted successfully. Staff and admin were notified.");

      setSelectedStartIndex(null);
      setSelectedEndIndex(null);

      setForm({
        booking_date: "",
        session_type: "training",
        include_coach: false,
        coach_id: "",
        coach_session_mode: "one_on_one",
        coach_participants: 1,
        notes: "",
      });

      await loadInitialData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Facility Booking" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <section className="mb-6 rounded-[28px] bg-gradient-to-br from-blue-600 to-slate-900 p-8 text-white">
            <p className="text-sm">Direct Facility Booking</p>
            <h2 className="mt-2 text-3xl font-black">
              Choose a facility, preview details, then book instantly.
            </h2>
            <p className="mt-2 text-sm">
              Select a facility, choose time slots, and optionally book a coach.
            </p>
          </section>

          <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">Available Facilities</h3>
                <p className="text-sm text-slate-500">
                  Select a facility to continue booking.
                </p>
              </div>

              <span className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {selectedFacility
                  ? selectedFacility.name
                  : "No facility selected yet"}
              </span>
            </div>

            {facilities.length === 0 ? (
              <p>No facilities available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className={`overflow-hidden rounded-3xl border bg-white ${
                      selectedFacility?.id === facility.id
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={getFacilityImages(facility)[0]}
                      alt={facility.name}
                      className="h-48 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = FACILITY_FALLBACK;
                      }}
                    />

                    <div className="p-4">
                      <h4 className="text-lg font-black">{facility.name}</h4>
                      <p className="text-sm text-slate-500">{facility.type}</p>

                      <p className="mt-2 text-sm font-bold text-blue-700">
                        {money(facility.price_per_hour || facility.price || 0)} / hour
                      </p>

                      <button
                        type="button"
                        onClick={() => handleFacilitySelect(facility)}
                        className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                      >
                        View / Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedFacility && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
              <aside className="rounded-[28px] bg-white p-6 shadow-sm">
                <img
                  src={selectedImage}
                  alt={selectedFacility.name}
                  className="h-72 w-full rounded-3xl object-cover"
                  onError={(e) => {
                    e.currentTarget.src = FACILITY_FALLBACK;
                  }}
                />

                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {getFacilityImages(selectedFacility).map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                        selectedImage === img
                          ? "border-blue-600"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={img}
                        alt="Facility preview"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <h3 className="mt-5 text-2xl font-black">
                  {selectedFacility.name}
                </h3>

                <p className="mt-1 text-blue-700">{selectedFacility.type}</p>

                <p className="mt-3 text-sm leading-7">
                  {selectedFacility.description || "No description provided."}
                </p>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">
                    Facility Rate
                  </p>
                  <p className="font-bold">{money(facilityRate)} / hour</p>
                </div>
              </aside>

              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">
                  Book {selectedFacility.name}
                </h3>

                <p className="text-sm text-slate-500">
                  Select a date, optional coach, then highlight a continuous
                  time range.
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
                        Session Type
                      </label>
                      <select
                        name="session_type"
                        value={form.session_type}
                        onChange={handleChange}
                        className="w-full rounded-2xl border px-4 py-3"
                      >
                        {SESSION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                    <label className="flex gap-3">
                      <input
                        type="checkbox"
                        name="include_coach"
                        checked={form.include_coach}
                        onChange={handleChange}
                      />

                      <div>
                        <p className="font-bold">
                          Book a coach with this facility
                        </p>
                        <p className="text-sm">
                          Coach availability and existing coach bookings will be checked.
                        </p>
                      </div>
                    </label>

                    {form.include_coach && (
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Select Coach
                          </label>

                          <select
                            name="coach_id"
                            value={form.coach_id}
                            onChange={handleChange}
                            className="w-full rounded-2xl border px-4 py-3"
                          >
                            <option value="">Select coach</option>

                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.id}>
                                {coach.name} - {money(coach.rate_per_hour || 0)} / hour •{" "}
                                {coach.available_start_time || "08:00"} -{" "}
                                {coach.available_end_time || "20:00"}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Coach Session Mode
                          </label>

                          <select
                            name="coach_session_mode"
                            value={form.coach_session_mode}
                            onChange={handleChange}
                            className="w-full rounded-2xl border px-4 py-3"
                          >
                            <option value="one_on_one">One-on-One</option>
                            <option value="group">Group</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {form.include_coach && selectedCoach && (
                      <div className="mt-4 flex gap-4 rounded-2xl bg-white p-4">
                        <img
                          src={
                            selectedCoach.image_path ||
                            selectedCoach.image_url ||
                            COACH_FALLBACK
                          }
                          alt={selectedCoach.name}
                          className="h-24 w-24 rounded-2xl object-cover"
                          onError={(e) => {
                            e.currentTarget.src = COACH_FALLBACK;
                          }}
                        />

                        <div className="flex-1">
                          <p className="font-black text-slate-950">
                            {selectedCoach.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {selectedCoach.specialty || "Coach"}
                          </p>
                          <p className="mt-1 text-sm">
                            <b>Rate:</b> {money(coachRate)} / hour
                          </p>
                          <p className="text-sm">
                            <b>Available Time:</b>{" "}
                            {selectedCoach.available_start_time || "08:00"} -{" "}
                            {selectedCoach.available_end_time || "20:00"}
                          </p>
                          <p className="text-sm">
                            <b>Coach Total:</b> {money(coachTotal)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h4 className="text-lg font-black">Available Time Slots</h4>
                    <p className="text-sm text-slate-500">
                      Unavailable slots are disabled automatically.
                    </p>

                    {!form.booking_date ? (
                      <div className="mt-4 rounded-2xl border border-dashed p-6">
                        Select a date first.
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
                        <span>Facility Rate</span>
                        <b>
                          {money(facilityRate)} × {totalHours} hr ={" "}
                          {money(facilityTotal)}
                        </b>
                      </div>

                      {form.include_coach && (
                        <>
                          <div className="flex justify-between">
                            <span>Coach</span>
                            <b>{selectedCoach?.name || "No coach selected"}</b>
                          </div>

                          <div className="flex justify-between">
                            <span>Coach Rate</span>
                            <b>
                              {money(coachRate)} × {totalHours} hr ={" "}
                              {money(coachTotal)}
                            </b>
                          </div>
                        </>
                      )}

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
                    placeholder="Optional notes about your booking"
                    className="mt-5 min-h-[120px] w-full rounded-2xl border px-4 py-3"
                  />

                  <button
                    disabled={submitting}
                    className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : form.include_coach
                      ? `Submit Facility + Coach Booking — ${money(totalAmount)}`
                      : `Submit Facility Booking — ${money(totalAmount)}`}
                  </button>
                </form>
              </section>
            </div>
          )}

          <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black">My Bookings</h3>

            {bookings.length === 0 ? (
              <p className="mt-4 text-slate-500">No booking requests yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`rounded-2xl border p-4 ${
                      booking.id === highlightId
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <h4 className="font-bold">
                      {booking.facilities?.name || "Facility Booking"}
                    </h4>

                    <p className="text-sm text-slate-500">
                      {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                      {formatTime(booking.end_time)}
                    </p>

                    <p className="mt-2 text-sm capitalize">
                      Status: <b>{booking.status}</b>
                    </p>

                    {booking.includes_coach && (
                      <p className="mt-1 text-sm text-blue-700">
                        Coach included • Coach Rate:{" "}
                        {money(booking.coach_rate_per_hour || 0)} / hour
                      </p>
                    )}

                    <p className="mt-1 text-sm font-bold">
                      Total: {money(booking.total_amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}