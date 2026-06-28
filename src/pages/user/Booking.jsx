import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { createBooking } from "../../services/bookingService";
import { useAuth } from "../../context/AuthContext";

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

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatTime(time24) {
  if (!time24) return "";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function formatSlotLabel(start, end) {
  return `${formatTime(start)}-${formatTime(end)}`;
}

function generateSlots() {
  return Array.from({ length: 17 }, (_, index) => {
    const startHour = 6 + index;
    const endHour = startHour + 1;

    const start = `${String(startHour).padStart(2, "0")}:00`;
    const end = `${String(endHour).padStart(2, "0")}:00`;

    return {
      index,
      start_time: start,
      end_time: end,
      label: formatSlotLabel(start, end),
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

function isPastSlot(date, startTime) {
  const today = getTodayDate();

  if (date > today) return false;
  if (date < today) return true;

  const now = new Date();
  const [hour, minute] = cleanTime(startTime).split(":").map(Number);
  const slotDate = new Date();

  slotDate.setHours(hour, minute, 0, 0);

  return slotDate <= now;
}

function getFacilityRate(facility) {
  return Number(facility?.price_per_hour || facility?.price || 0);
}

function getFacilityType(facility) {
  return facility?.type || facility?.category || "Facility";
}

function getSelectedKey(facilityId, slot) {
  return `${facilityId}-${slot.start_time}-${slot.end_time}`;
}

function groupSelectedSlots(selectedCells) {
  if (!selectedCells.length) return [];

  const sorted = [...selectedCells].sort((a, b) => a.slot_index - b.slot_index);
  const groups = [];

  sorted.forEach((cell) => {
    const lastGroup = groups[groups.length - 1];
    const lastCell = lastGroup?.[lastGroup.length - 1];

    if (!lastGroup || cell.slot_index !== lastCell.slot_index + 1) {
      groups.push([cell]);
      return;
    }

    lastGroup.push(cell);
  });

  return groups;
}

export default function Booking() {
  const { user, profile: authProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedCells, setSelectedCells] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);

  const [form, setForm] = useState({
    session_type: "training",
    notes: "",
  });

  const slots = useMemo(() => generateSlots(), []);

  const selectedFacility = useMemo(() => {
    if (!selectedCells.length) return null;

    return facilities.find(
      (facility) => String(facility.id) === String(selectedCells[0].facility_id)
    );
  }, [facilities, selectedCells]);

  const selectedGroups = useMemo(() => {
    return groupSelectedSlots(selectedCells);
  }, [selectedCells]);

  const totalHours = useMemo(() => {
    return selectedCells.reduce((sum, cell) => {
      return sum + hoursBetween(cell.start_time, cell.end_time);
    }, 0);
  }, [selectedCells]);

  const facilityRate = getFacilityRate(selectedFacility);
  const totalAmount = totalHours * facilityRate;

  useEffect(() => {
    if (user?.id) loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    loadBookingsForDate();
    setSelectedCells([]);
    setConfirmModal(false);
  }, [selectedDate]);

  useEffect(() => {
    const channel = supabase
      .channel(`booking-schedule-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookingsForDate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

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
        }
      );

      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: true });

      if (facilitiesError) throw facilitiesError;

      setFacilities(facilitiesData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking page.");
    }
  }

  async function loadBookingsForDate() {
    try {
      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", selectedDate)
        .in("status", ["approved", "pending"]);

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load court schedule.");
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function getBookingForCell(facilityId, slot) {
    return bookings.find((booking) => {
      return (
        String(booking.facility_id) === String(facilityId) &&
        overlaps(
          slot.start_time,
          slot.end_time,
          booking.start_time,
          booking.end_time
        )
      );
    });
  }

  function isCellSelected(facilityId, slot) {
    const key = getSelectedKey(facilityId, slot);

    return selectedCells.some((cell) => cell.key === key);
  }

  function getCellState(facility, slot) {
    const existingBooking = getBookingForCell(facility.id, slot);

    if (existingBooking) {
      return {
        state: "booked",
        label: normalizeBookedLabel(existingBooking.status),
        booking: existingBooking,
      };
    }

    if (isPastSlot(selectedDate, slot.start_time)) {
      return {
        state: "past",
        label: "Unavailable",
        booking: null,
      };
    }

    if (isCellSelected(facility.id, slot)) {
      return {
        state: "selected",
        label: "Selected",
        booking: null,
      };
    }

    return {
      state: "open",
      label: "Open",
      booking: null,
    };
  }

  function normalizeBookedLabel(status) {
    const value = String(status || "").toLowerCase();

    if (value === "pending") return "Pending";
    if (value === "approved") return "Booked";

    return "Booked";
  }

  function handleCellClick(facility, slot) {
    const cell = getCellState(facility, slot);

    if (cell.state === "booked" || cell.state === "past") return;

    const key = getSelectedKey(facility.id, slot);

    setMessage("");
    setError("");
    setConfirmModal(false);

    if (cell.state === "selected") {
      setSelectedCells((prev) => prev.filter((item) => item.key !== key));
      return;
    }

    if (
      selectedCells.length > 0 &&
      String(selectedCells[0].facility_id) !== String(facility.id)
    ) {
      setSelectedCells([
        {
          key,
          facility_id: facility.id,
          facility_name: facility.name,
          facility_type: getFacilityType(facility),
          slot_index: slot.index,
          start_time: slot.start_time,
          end_time: slot.end_time,
        },
      ]);

      setMessage(
        "Selection moved to another facility. Previous selected slots were cleared."
      );

      return;
    }

    setSelectedCells((prev) => [
      ...prev,
      {
        key,
        facility_id: facility.id,
        facility_name: facility.name,
        facility_type: getFacilityType(facility),
        slot_index: slot.index,
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
    ]);
  }

  function validateSelectedCells() {
    if (!selectedFacility) return "Please select an available slot.";
    if (!selectedDate) return "Please select a booking date.";
    if (!selectedCells.length) return "Please select at least one time slot.";

    for (const cell of selectedCells) {
      const existingBooking = getBookingForCell(cell.facility_id, {
        start_time: cell.start_time,
        end_time: cell.end_time,
      });

      if (existingBooking) {
        return "One or more selected slots are no longer available.";
      }

      if (isPastSlot(selectedDate, cell.start_time)) {
        return "You cannot book a past time slot.";
      }
    }

    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!profile?.id) return setError("Please login first.");

    const validationError = validateSelectedCells();

    if (validationError) {
      return setError(validationError);
    }

    setConfirmModal(true);
  }

  async function confirmBookingSubmit() {
    setError("");
    setMessage("");

    if (!profile?.id) return setError("Please login first.");

    const validationError = validateSelectedCells();

    if (validationError) {
      setConfirmModal(false);
      return setError(validationError);
    }

    try {
      setSubmitting(true);

      for (const group of selectedGroups) {
        const firstSlot = group[0];
        const lastSlot = group[group.length - 1];
        const groupStartTime = firstSlot.start_time;
        const groupEndTime = lastSlot.end_time;
        const groupHours = hoursBetween(groupStartTime, groupEndTime);
        const groupTotal = groupHours * facilityRate;

        await createBooking({
          user_id: profile.id,
          facility_id: selectedFacility.id,
          booking_date: selectedDate,
          start_time: groupStartTime,
          end_time: groupEndTime,
          session_type: form.session_type,
          notes: form.notes || "",
          total_hours: groupHours,
          rate_per_hour: facilityRate,
          total_amount: groupTotal,
          includes_coach: false,
          linked_coach_id: null,
          coach_rate_per_hour: 0,
          coach_session_mode: null,
          coach_participants: 1,
        });
      }

      setMessage(
        selectedGroups.length > 1
          ? `${selectedGroups.length} booking requests submitted successfully.`
          : "Facility booking request submitted successfully."
      );

      setSelectedCells([]);
      setConfirmModal(false);
      setForm({
        session_type: "training",
        notes: "",
      });

      await loadBookingsForDate();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  function goToPreviousDay() {
    const previousDate = addDays(selectedDate, -1);

    if (previousDate < getTodayDate()) return;

    setSelectedDate(previousDate);
  }

  function goToNextDay() {
    setSelectedDate(addDays(selectedDate, 1));
  }

  function clearSelection() {
    setSelectedCells([]);
    setConfirmModal(false);
    setMessage("");
    setError("");
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
            <p className="text-sm font-semibold">Court Schedule Booking</p>

            <h2 className="mt-2 text-3xl font-black">
              Choose open slots from the court schedule.
            </h2>

            <p className="mt-2 text-sm text-white/90">
              Click green slots to select them. Click selected orange slots again
              to deselect them.
            </p>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Today&apos;s Court Schedule
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select one or more available slots to book.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousDay}
                  disabled={selectedDate <= getTodayDate()}
                  className="rounded-xl border border-[#DED8D2] px-4 py-3 font-black text-[#2B2B2B] hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>

                <input
                  type="date"
                  min={getTodayDate()}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-xl border border-[#DED8D2] px-4 py-3 text-sm font-bold outline-none focus:border-[#C97B6C]"
                />

                <button
                  type="button"
                  onClick={goToNextDay}
                  className="rounded-xl border border-[#DED8D2] px-4 py-3 font-black text-[#2B2B2B] hover:bg-[#F5F3F1]"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-xl font-black text-[#2B2B2B]">
                {formatDate(selectedDate)}
              </h4>

              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                <Legend color="bg-green-100 border-green-400" label="Open" />
                <Legend
                  color="bg-orange-100 border-orange-400"
                  label="Selected"
                />
                <Legend
                  color="bg-slate-100 border-slate-300"
                  label="Booked / Unavailable"
                />
              </div>
            </div>

            {facilities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No facilities available yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-[120px] border border-[#DED8D2] px-4 py-4 text-left font-black text-[#2B2B2B]">
                        Time
                      </th>

                      {facilities.map((facility, index) => (
                        <th
                          key={facility.id}
                          className="min-w-[130px] border border-[#DED8D2] px-4 py-4 text-center"
                        >
                          <p className="font-black text-[#2B2B2B]">
                            {facility.name || `Court ${index + 1}`}
                          </p>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {getFacilityType(facility)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[#C97B6C]">
                            {money(getFacilityRate(facility))}/hr
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.start_time}>
                        <td className="border border-[#DED8D2] bg-slate-50 px-4 py-3 font-bold text-slate-600">
                          {slot.label}
                        </td>

                        {facilities.map((facility) => {
                          const cell = getCellState(facility, slot);

                          return (
                            <td
                              key={`${facility.id}-${slot.start_time}`}
                              className="border border-[#DED8D2] p-0"
                            >
                              <button
                                type="button"
                                disabled={
                                  cell.state === "booked" ||
                                  cell.state === "past"
                                }
                                onClick={() => handleCellClick(facility, slot)}
                                className={`flex h-[58px] w-full items-center justify-center px-2 text-xs font-bold transition ${getCellClass(
                                  cell.state
                                )}`}
                                title={`${facility.name} • ${slot.label} • ${cell.label}`}
                              >
                                {cell.label}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]"
          >
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Booking Information
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add the session type and optional notes before submitting.
              </p>

              <div className="mt-6">
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

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional notes about your booking"
                className="mt-5 min-h-[140px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
              />
            </section>

            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Booking Summary
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Selected slots will be submitted for staff approval.
                  </p>
                </div>

                {selectedCells.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-xl border border-[#DED8D2] px-3 py-2 text-xs font-bold hover:bg-[#F5F3F1]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {!selectedFacility || selectedCells.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-[#DED8D2] p-5 text-sm text-slate-500">
                  Select open slot(s) from the schedule to see the booking
                  summary.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <SummaryRow label="Facility" value={selectedFacility.name} />
                  <SummaryRow
                    label="Facility Type"
                    value={getFacilityType(selectedFacility)}
                  />
                  <SummaryRow label="Date" value={formatDate(selectedDate)} />
                  <SummaryRow
                    label="Selected Slots"
                    value={`${selectedCells.length} slot(s)`}
                  />
                  <SummaryRow
                    label="Total Hours"
                    value={`${totalHours} hour(s)`}
                  />
                  <SummaryRow
                    label="Rate"
                    value={`${money(facilityRate)} / hour`}
                  />

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-black text-[#2B2B2B]">
                      Selected Time Range(s)
                    </p>

                    <div className="space-y-2">
                      {selectedGroups.map((group, index) => {
                        const firstSlot = group[0];
                        const lastSlot = group[group.length - 1];

                        return (
                          <div
                            key={`${firstSlot.start_time}-${lastSlot.end_time}`}
                            className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                          >
                            <span>Request {index + 1}</span>
                            <b>
                              {formatTime(firstSlot.start_time)} -{" "}
                              {formatTime(lastSlot.end_time)}
                            </b>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F5F3F1] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#2B2B2B]">
                        Total Amount
                      </span>

                      <span className="text-2xl font-black text-[#C97B6C]">
                        {money(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || selectedCells.length === 0}
                className="mt-5 w-full rounded-2xl bg-[#C97B6C] px-6 py-4 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : `Review Booking — ${money(totalAmount)}`}
              </button>
            </section>
          </form>

          {confirmModal && selectedFacility && selectedCells.length > 0 && (
            <ConfirmBookingModal
              selectedFacility={selectedFacility}
              selectedDate={selectedDate}
              selectedGroups={selectedGroups}
              selectedCells={selectedCells}
              form={form}
              totalHours={totalHours}
              facilityRate={facilityRate}
              totalAmount={totalAmount}
              submitting={submitting}
              onClose={() => setConfirmModal(false)}
              onConfirm={confirmBookingSubmit}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ConfirmBookingModal({
  selectedFacility,
  selectedDate,
  selectedGroups,
  selectedCells,
  form,
  totalHours,
  facilityRate,
  totalAmount,
  submitting,
  onClose,
  onConfirm,
}) {
  const selectedSession =
    SESSION_TYPES.find((type) => type.value === form.session_type)?.label ||
    form.session_type;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Confirm Booking
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Review your booking request
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please check the details before submitting for staff approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Facility" value={selectedFacility.name} />
          <DetailItem label="Facility Type" value={getFacilityType(selectedFacility)} />
          <DetailItem label="Date" value={formatDate(selectedDate)} />
          <DetailItem label="Session Type" value={selectedSession} />
          <DetailItem label="Selected Slots" value={`${selectedCells.length} slot(s)`} />
          <DetailItem label="Total Hours" value={`${totalHours} hour(s)`} />
          <DetailItem label="Rate Per Hour" value={money(facilityRate)} />
          <DetailItem label="Total Amount" value={money(totalAmount)} />
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-black text-[#2B2B2B]">
            Booking Request(s)
          </p>

          <div className="space-y-2">
            {selectedGroups.map((group, index) => {
              const firstSlot = group[0];
              const lastSlot = group[group.length - 1];
              const hours = hoursBetween(firstSlot.start_time, lastSlot.end_time);
              const total = hours * facilityRate;

              return (
                <div
                  key={`${firstSlot.start_time}-${lastSlot.end_time}`}
                  className="rounded-2xl bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-[#2B2B2B]">
                      Request {index + 1}
                    </p>

                    <p className="text-sm font-black text-[#C97B6C]">
                      {money(total)}
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {formatTime(firstSlot.start_time)} -{" "}
                    {formatTime(lastSlot.end_time)} • {hours} hour(s)
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#F5F3F1] p-4">
          <div className="flex items-center justify-between">
            <span className="font-black text-[#2B2B2B]">Final Total</span>

            <span className="text-2xl font-black text-[#C97B6C]">
              {money(totalAmount)}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Notes</p>

          <p className="mt-2 text-sm text-slate-600">
            {form.notes?.trim() || "No notes provided."}
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Edit Selection
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Confirm and Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getCellClass(state) {
  if (state === "booked") {
    return "cursor-not-allowed bg-slate-100 text-slate-500";
  }

  if (state === "past") {
    return "cursor-not-allowed bg-slate-50 text-slate-300";
  }

  if (state === "selected") {
    return "border border-orange-400 bg-orange-100 text-orange-700 hover:bg-orange-200";
  }

  return "border border-green-400 bg-green-100 text-green-700 hover:bg-green-200";
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${color}`} />
      {label}
    </span>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#DED8D2] pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className="text-right text-[#2B2B2B]">{value || "-"}</b>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}