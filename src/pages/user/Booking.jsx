import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { createBooking } from "../../services/bookingService";
import { useAuth } from "../../context/AuthContext";

const FACILITY_FALLBACK = "https://via.placeholder.com/800x500?text=Facility";

const SESSION_TYPES = [
  { value: "training", label: "Training" },
  { value: "instructional", label: "Instructional" },
  { value: "recreational", label: "Recreational" },
];

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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
  return (
    cleanTime(aStart) < cleanTime(bEnd) &&
    cleanTime(aEnd) > cleanTime(bStart)
  );
}

function getFacilityImages(item) {
  const images = [
    ...(Array.isArray(item?.image_urls) ? item.image_urls : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    item?.image_url,
    item?.image,
  ].filter(Boolean);

  return [...new Set(images)].length
    ? [...new Set(images)]
    : [FACILITY_FALLBACK];
}

export default function Booking() {
  const { user, profile: authProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [approvedBookings, setApprovedBookings] = useState([]);

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    booking_date: "",
    session_type: "training",
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
  const endTime = selectedRange[selectedRange.length - 1]?.end_time || "";
  const totalHours = hoursBetween(startTime, endTime);

  const facilityRate = Number(
    selectedFacility?.price_per_hour || selectedFacility?.price || 0
  );

  const facilityTotal = totalHours * facilityRate;
  const totalAmount = facilityTotal;

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
    const channel = supabase
      .channel(`booking-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          if (selectedFacility?.id && form.booking_date) {
            loadApprovedBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFacility?.id, form.booking_date]);

  if (authProfile?.role === "staff") return <Navigate to="/staff" replace />;
  if (authProfile?.role === "admin") return <Navigate to="/admin" replace />;

  async function loadInitialData() {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(
        profileData || {
          id: user.id,
          role: "user",
          full_name: user.email,
          email: user.email,
        }
      );

      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (facilitiesError) throw facilitiesError;

      setFacilities(facilitiesData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking page.");
    }
  }

  async function loadApprovedBookings() {
    if (!selectedFacility?.id || !form.booking_date) return;

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("facility_id", selectedFacility.id)
      .eq("booking_date", form.booking_date)
      .in("status", ["approved", "pending"]);

    setApprovedBookings(data || []);
  }

  function handleFacilitySelect(facility) {
    setSelectedFacility(facility);
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setMessage("");
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

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
    return approvedBookings.some((booking) =>
      overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
    );
  }

  function getSlotLabel(slot) {
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
        includes_coach: false,
        linked_coach_id: null,
        coach_rate_per_hour: 0,
        coach_session_mode: null,
        coach_participants: 1,
      });

      setMessage("Facility booking request submitted successfully.");

      setSelectedStartIndex(null);
      setSelectedEndIndex(null);

      setForm({
        booking_date: "",
        session_type: "training",
        notes: "",
      });

      await loadApprovedBookings();
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

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Direct Facility Booking</p>

            <h2 className="mt-2 text-3xl font-black">
              Choose a facility and book your schedule.
            </h2>

            <p className="mt-2 text-sm text-white/90">
              Select a facility, choose a date, then pick your available time
              slot.
            </p>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Available Facilities
                </h3>

                <p className="text-sm text-slate-500">
                  Select a facility to continue booking.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {selectedFacility
                  ? selectedFacility.name
                  : "No facility selected yet"}
              </span>
            </div>

            {facilities.length === 0 ? (
              <p className="text-sm text-slate-500">
                No facilities available yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className={`overflow-hidden rounded-3xl border bg-white ${
                      selectedFacility?.id === facility.id
                        ? "border-[#C97B6C] ring-2 ring-[#D88E80]/40"
                        : "border-[#DED8D2]"
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
                      <h4 className="text-lg font-black text-[#2B2B2B]">
                        {facility.name}
                      </h4>

                      <p className="text-sm text-slate-500">{facility.type}</p>

                      <p className="mt-2 text-sm font-bold text-[#C97B6C]">
                        {money(facility.price_per_hour || facility.price || 0)}{" "}
                        / hour
                      </p>

                      <button
                        type="button"
                        onClick={() => handleFacilitySelect(facility)}
                        className="mt-4 w-full rounded-2xl bg-[#C97B6C] px-4 py-3 font-bold text-white hover:bg-[#B87463]"
                      >
                        View / Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedFacility && (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Book {selectedFacility.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Choose a date, then highlight a continuous time range.
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
                      min={getTodayDate()}
                      value={form.booking_date}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
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
                      className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                    >
                      {SESSION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-black text-[#2B2B2B]">
                    Available Time Slots
                  </h4>

                  {!form.booking_date ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
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
                                ? "border-[#C97B6C] bg-[#C97B6C] text-white"
                                : "border-[#DED8D2] bg-white hover:bg-[#F3E4DF]"
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

                <div className="mt-6 rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-5">
                  <h4 className="text-lg font-black text-[#2B2B2B]">
                    Payment Summary
                  </h4>

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

                    <div className="flex justify-between border-t border-[#DED8D2] pt-3 text-base">
                      <span className="font-black">Total Amount</span>
                      <b className="text-[#C97B6C]">{money(totalAmount)}</b>
                    </div>
                  </div>
                </div>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes about your booking"
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : `Submit Facility Booking — ${money(totalAmount)}`}
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}