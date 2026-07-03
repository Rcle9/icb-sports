import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { createWalkInBooking } from "../../services/walkInBookingService";
import { useAuth } from "../../context/AuthContext";

const SESSION_TYPES = [
  { value: "recreational", label: "Recreational" },
  { value: "training", label: "Training" },
  { value: "instructional", label: "Instructional" },
];

const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer", "Other"];

const SPORT_FILTERS = [
  { value: "all", label: "All Sports" },
  { value: "pickleball", label: "Pickleball" },
  { value: "basketball", label: "Basketball" },
  { value: "table_tennis", label: "Table Tennis" },
];

function normalizeFacilityType(value) {
  const type = String(value || "").toLowerCase().trim();

  if (type.includes("pickle")) return "pickleball";
  if (type.includes("basket")) return "basketball";
  if (type.includes("table") || type.includes("tennis")) return "table_tennis";

  return type.replaceAll(" ", "_");
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = cleanTime(time).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
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

function getFacilityRate(facility) {
  return Number(
    facility?.rate_per_hour ||
      facility?.price_per_hour ||
      facility?.hourly_rate ||
      facility?.price ||
      0
  );
}

function getReservedMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function isExpiredReservedBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const minutesLeft = getReservedMinutesLeft(booking);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus) &&
    minutesLeft !== null &&
    minutesLeft <= 0
  );
}

function isPastSlot(bookingDate, slot) {
  const today = getTodayDate();

  if (!bookingDate) return false;

  if (bookingDate < today) return true;
  if (bookingDate > today) return false;

  return cleanTime(slot.end_time) <= getCurrentTimeValue();
}

function getRequesterName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || "User";
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getBlockedClass(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

 if (status === "approved" && paymentStatus === "paid") {
  return "border-slate-400 bg-slate-200 text-slate-700";
}

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "border-yellow-500 bg-yellow-100 text-yellow-800";
  }

  if (status === "reserved") {
    return "border-blue-500 bg-blue-100 text-blue-800";
  }

  if (status === "pending") {
    return "border-yellow-500 bg-yellow-100 text-yellow-800";
  }

  return "border-slate-400 bg-slate-100 text-slate-700";
}

function getSlotKey(facilityId, slot) {
  return `${facilityId}-${slot.start_time}-${slot.end_time}`;
}

function groupSelectedSlots(selectedSlots, facilities) {
  const facilityMap = new Map(facilities.map((facility) => [String(facility.id), facility]));
  const grouped = new Map();

  selectedSlots.forEach((item) => {
    const key = String(item.facility_id);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(item);
  });

  const bookingGroups = [];

  grouped.forEach((items, facilityId) => {
    const facility = facilityMap.get(String(facilityId));

    const sortedItems = [...items].sort((a, b) => {
      if (a.slot.index !== b.slot.index) return a.slot.index - b.slot.index;
      return String(a.slot.start_time).localeCompare(String(b.slot.start_time));
    });

    sortedItems.forEach((item) => {
      const lastGroup = bookingGroups[bookingGroups.length - 1];
      const sameFacility = String(lastGroup?.facility_id) === String(item.facility_id);
      const continuous = lastGroup?.end_time === item.slot.start_time;

      if (lastGroup && sameFacility && continuous) {
        lastGroup.slots.push(item.slot);
        lastGroup.end_time = item.slot.end_time;
        lastGroup.label = `${formatTime(lastGroup.start_time)} - ${formatTime(
          lastGroup.end_time
        )}`;
        lastGroup.total_hours = hoursBetween(lastGroup.start_time, lastGroup.end_time);
        lastGroup.total_amount = lastGroup.total_hours * lastGroup.rate_per_hour;
      } else {
        const rate = getFacilityRate(facility);

        bookingGroups.push({
          facility_id: item.facility_id,
          facility,
          slots: [item.slot],
          start_time: item.slot.start_time,
          end_time: item.slot.end_time,
          label: item.slot.label,
          total_hours: hoursBetween(item.slot.start_time, item.slot.end_time),
          rate_per_hour: rate,
          total_amount: hoursBetween(item.slot.start_time, item.slot.end_time) * rate,
        });
      }
    });
  });

  return bookingGroups;
}

export default function WalkInBooking() {
  const { user } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [bookingsForDate, setBookingsForDate] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [form, setForm] = useState({
    booking_date: getTodayDate(),
    customer_name: "",
    contact_number: "",
    session_type: "recreational",
    payment_method: "Cash",
    payment_reference: "",
    amount_paid: "",
    notes: "",
  });

  const [selectedSportFilter, setSelectedSportFilter] = useState("pickleball");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const slots = useMemo(() => generateSlots(), []);

  const filteredFacilities = useMemo(() => {
    if (selectedSportFilter === "all") return facilities;

    return facilities.filter(
      (facility) => normalizeFacilityType(facility.type) === selectedSportFilter
    );
  }, [facilities, selectedSportFilter]);

  const selectedGroups = useMemo(() => {
    return groupSelectedSlots(selectedSlots, facilities);
  }, [selectedSlots, facilities]);

  const selectedSummary = useMemo(() => {
    const totalHours = selectedGroups.reduce(
      (sum, group) => sum + Number(group.total_hours || 0),
      0
    );

    const totalAmount = selectedGroups.reduce(
      (sum, group) => sum + Number(group.total_amount || 0),
      0
    );

    return {
      total_hours: totalHours,
      total_amount: totalAmount,
      total_slots: selectedSlots.length,
      total_groups: selectedGroups.length,
    };
  }, [selectedGroups, selectedSlots]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (form.booking_date) {
      loadScheduleForDate();
      loadMaintenanceBlocksForDate();
    }
  }, [form.booking_date]);

  useEffect(() => {
    const channel = supabase
      .channel(`walk-in-booking-live-${form.booking_date}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadScheduleForDate(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_maintenance_blocks",
        },
        () => {
          loadMaintenanceBlocksForDate(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [form.booking_date]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      const activeFacilities = (data || []).filter((facility) => {
        if (facility.is_active === undefined || facility.is_active === null) {
          return true;
        }

        return facility.is_active;
      });

      setFacilities(activeFacilities);

      await loadScheduleForDate(false);
      await loadMaintenanceBlocksForDate(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load walk-in booking page.");
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduleForDate(showLoading = true) {
    try {
      if (!form.booking_date) return;

      if (showLoading) setLoadingSchedule(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .eq("booking_date", form.booking_date)
        .in("status", ["reserved", "pending", "approved"]);

      if (error) throw error;

      setBookingsForDate(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function loadMaintenanceBlocksForDate() {
    try {
      if (!form.booking_date) return;

      const { data, error } = await supabase
        .from("facility_maintenance_blocks")
        .select("*")
        .eq("maintenance_date", form.booking_date)
        .eq("status", "active");

      if (error) throw error;

      setMaintenanceBlocks(data || []);
    } catch (err) {
      console.error("Failed to load maintenance blocks:", err);
    }
  }

  function handleSportFilterChange(value) {
    setSelectedSportFilter(value);
    setSelectedSlots([]);
    setError("");
    setMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "booking_date") {
      setSelectedSlots([]);
    }
  }

  function getBlockingBooking(facilityId, slot) {
    return (bookingsForDate || []).find((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      if (String(booking.facility_id) !== String(facilityId)) return false;

      if (!["reserved", "pending", "approved"].includes(status)) return false;

      if (
        status === "reserved" &&
        ["unpaid", "rejected_payment"].includes(paymentStatus) &&
        isExpiredReservedBooking(booking)
      ) {
        return false;
      }

      return overlaps(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      );
    });
  }

  function getMaintenanceBlock(facilityId, slot) {
    return (maintenanceBlocks || []).find((block) => {
      if (String(block.facility_id) !== String(facilityId)) return false;
      if (normalizeStatus(block.status) !== "active") return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        block.start_time,
        block.end_time
      );
    });
  }

  function isSlotSelected(facilityId, slot) {
    const key = getSlotKey(facilityId, slot);

    return selectedSlots.some((item) => item.key === key);
  }

  function isSlotBlocked(facilityId, slot) {
    return (
      isPastSlot(form.booking_date, slot) ||
      Boolean(getBlockingBooking(facilityId, slot)) ||
      Boolean(getMaintenanceBlock(facilityId, slot))
    );
  }

  function handleSlotSelect(facility, slot) {
    if (isPastSlot(form.booking_date, slot)) {
      setError("Past time slots are no longer available.");
      return;
    }

    const maintenanceBlock = getMaintenanceBlock(facility.id, slot);

    if (maintenanceBlock) {
      setError("This facility is under maintenance during this timeslot.");
      return;
    }

    const booking = getBlockingBooking(facility.id, slot);

    if (booking) {
      setError("This timeslot is already reserved or booked.");
      return;
    }

    setError("");
    setMessage("");

    const key = getSlotKey(facility.id, slot);

    setSelectedSlots((prev) => {
      const exists = prev.some((item) => item.key === key);

      if (exists) {
        return prev.filter((item) => item.key !== key);
      }

      return [
        ...prev,
        {
          key,
          facility_id: facility.id,
          facility_name: facility.name,
          slot,
        },
      ];
    });
  }

  function validateForm() {
    setError("");
    setMessage("");

    if (!user?.id) {
      setError("Staff account is required.");
      return false;
    }

    if (!form.booking_date) {
      setError("Please select a booking date.");
      return false;
    }

    if (form.booking_date < getTodayDate()) {
      setError("Past dates are not allowed.");
      return false;
    }

    if (!form.customer_name.trim()) {
      setError("Please enter the walk-in customer name.");
      return false;
    }

    if (selectedSlots.length === 0) {
      setError("Please select at least one available time slot.");
      return false;
    }

    const blockedSelectedSlot = selectedSlots.find((item) =>
      isSlotBlocked(item.facility_id, item.slot)
    );

    if (blockedSelectedSlot) {
      setError("One or more selected slots are no longer available.");
      loadScheduleForDate(false);
      loadMaintenanceBlocksForDate(false);
      return false;
    }

    return true;
  }

  function openConfirmModal() {
    if (!validateForm()) return;

    setForm((prev) => ({
      ...prev,
      amount_paid: prev.amount_paid || String(selectedSummary.total_amount),
    }));

    setConfirmModal(true);
  }

  function closeConfirmModal() {
    if (submitting) return;
    setConfirmModal(false);
  }

  async function handleSubmitWalkInBooking() {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await loadScheduleForDate(false);
      await loadMaintenanceBlocksForDate(false);

      const blockedSelectedSlot = selectedSlots.find((item) =>
        isSlotBlocked(item.facility_id, item.slot)
      );

      if (blockedSelectedSlot) {
        throw new Error("One or more selected slots are no longer available.");
      }

      const amountPaid =
        form.amount_paid === ""
          ? selectedSummary.total_amount
          : Number(form.amount_paid || 0);

      if (amountPaid < selectedSummary.total_amount) {
        throw new Error("Amount paid must be equal to or greater than the total amount.");
      }

      const savedBookings = [];

      for (const group of selectedGroups) {
        const savedBooking = await createWalkInBooking({
          staff_id: user.id,
          facility_id: group.facility_id,
          booking_date: form.booking_date,
          start_time: group.start_time,
          end_time: group.end_time,
          customer_name: form.customer_name.trim(),
          contact_number: form.contact_number.trim(),
          session_type: form.session_type,
          notes: form.notes,
          total_hours: group.total_hours,
          rate_per_hour: group.rate_per_hour,
          total_amount: group.total_amount,
          payment_method: form.payment_method,
          payment_reference: form.payment_reference.trim(),
          amount_paid: group.total_amount,
        });

        savedBookings.push(savedBooking);
      }

      const receipts = savedBookings
        .map((booking) => booking?.receipt_number)
        .filter(Boolean)
        .join(", ");

      setMessage(
        `Walk-in booking created successfully.${
          receipts ? ` Receipt(s): ${receipts}` : ""
        }`
      );

      setSelectedSlots([]);
      setConfirmModal(false);
      setForm((prev) => ({
        ...prev,
        customer_name: "",
        contact_number: "",
        payment_reference: "",
        amount_paid: "",
        notes: "",
      }));

      await loadScheduleForDate(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create walk-in booking.");
    } finally {
      setSubmitting(false);
    }
  }

  function goToPreviousDate() {
    const [year, month, day] = form.booking_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() - 1);

    const nextValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

    if (nextValue < getTodayDate()) return;

    setForm((prev) => ({
      ...prev,
      booking_date: nextValue,
    }));

    setSelectedSlots([]);
  }

  function goToNextDate() {
    const [year, month, day] = form.booking_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + 1);

    const nextValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

    setForm((prev) => ({
      ...prev,
      booking_date: nextValue,
    }));

    setSelectedSlots([]);
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Walk-in Booking" />

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
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">Staff Walk-in Booking</p>

                <h2 className="mt-2 text-3xl font-black">
                  Create approved bookings for walk-in customers.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Select available slots across exact courts or tables, record customer details,
                  and mark payment as received.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest">
                  Selected Slots
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {selectedSummary.total_slots}
                </h3>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Customer and Payment Details
              </h3>

              <p className="text-sm text-slate-500">
                Walk-in bookings are automatically approved and paid.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField
                label="Customer Name"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />

              <InputField
                label="Contact Number"
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                placeholder="Optional contact number"
              />

              <FilterSelect
                label="Session Type"
                name="session_type"
                value={form.session_type}
                onChange={handleChange}
                options={SESSION_TYPES}
              />

              <FilterSelect
                label="Payment Method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                options={PAYMENT_METHODS.map((method) => ({
                  value: method,
                  label: method,
                }))}
              />

              <InputField
                label="Payment Reference"
                name="payment_reference"
                value={form.payment_reference}
                onChange={handleChange}
                placeholder="Optional for cash"
              />

              <InputField
                label="Amount Paid"
                name="amount_paid"
                type="number"
                value={form.amount_paid}
                onChange={handleChange}
                placeholder={String(selectedSummary.total_amount || 0)}
              />

              <div className="lg:col-span-3">
                <label className="mb-2 block text-sm font-semibold">Notes</label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes"
                  className="min-h-[90px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Select Walk-in Schedule
                </h3>

                <p className="text-sm text-slate-500">
                  Choose one or more available slots. Each court/table is shown as a separate column.
                </p>

                <h4 className="mt-4 text-xl font-black text-[#2B2B2B]">
                  {formatDate(form.booking_date)}
                </h4>

                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                  <Legend color="bg-green-100 border-green-500" label="Open" />
                  <Legend color="bg-[#F3E4DF] border-[#C97B6C]" label="Selected" />
                  <Legend color="bg-blue-100 border-blue-500" label="Reserved" />
                  <Legend
                    color="bg-yellow-100 border-yellow-500"
                    label="Payment Review"
                  />
                  <Legend color="bg-green-100 border-green-600" label="Booked/Paid" />
                  <Legend color="bg-purple-100 border-purple-500" label="Maintenance" />
                  <Legend color="bg-slate-200 border-slate-400" label="Past Time" />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {SPORT_FILTERS.map((sport) => (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => handleSportFilterChange(sport.value)}
                      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                        selectedSportFilter === sport.value
                          ? "bg-[#C97B6C] text-white"
                          : "border border-[#DED8D2] text-slate-600 hover:bg-[#F5F3F1]"
                      }`}
                    >
                      {sport.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousDate}
                  disabled={form.booking_date <= getTodayDate()}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ‹
                </button>

                <input
                  type="date"
                  name="booking_date"
                  value={form.booking_date}
                  min={getTodayDate()}
                  onChange={handleChange}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-bold outline-none focus:border-[#C97B6C]"
                />

                <button
                  type="button"
                  onClick={goToNextDate}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
                >
                  ›
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading walk-in booking...</p>
            ) : filteredFacilities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No facilities found for this sport type.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-[160px] border border-[#DED8D2] px-4 py-4 text-left text-[#2B2B2B]">
                        Time
                      </th>

                      {filteredFacilities.map((facility) => (
                        <th
                          key={facility.id}
                          className="border border-[#DED8D2] px-4 py-4 text-center text-[#2B2B2B]"
                        >
                          <div className="font-black">{facility.name}</div>
                          <div className="mt-1 text-xs font-black text-[#C97B6C]">
                            {money(getFacilityRate(facility))}/hr
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.label}>
                        <td className="border border-[#DED8D2] px-4 py-4 font-bold text-[#2B2B2B]">
                          {slot.label}
                        </td>

                        {filteredFacilities.map((facility) => {
                          const pastSlot = isPastSlot(form.booking_date, slot);
                          const maintenanceBlock = getMaintenanceBlock(facility.id, slot);
                          const blockingBooking = getBlockingBooking(facility.id, slot);
                          const selected = isSlotSelected(facility.id, slot);

                          const blocked =
                            pastSlot ||
                            Boolean(maintenanceBlock) ||
                            Boolean(blockingBooking);

                          return (
                            <td
                              key={`${facility.id}-${slot.index}`}
                              className="border border-[#DED8D2] p-1"
                            >
                              <button
                                type="button"
                                disabled={blocked || loadingSchedule}
                                onClick={() => handleSlotSelect(facility, slot)}
                                className={`min-h-[70px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black transition ${
                                  blocked
                                    ? pastSlot
                                      ? "cursor-not-allowed border-slate-400 bg-slate-200 text-slate-600"
                                      : maintenanceBlock
                                      ? "cursor-not-allowed border-purple-500 bg-purple-100 text-purple-800"
                                      : `cursor-not-allowed ${getBlockedClass(blockingBooking)}`
                                    : selected
                                    ? "border-[#C97B6C] bg-[#F3E4DF] text-[#C97B6C] ring-2 ring-[#C97B6C]/25"
                                    : "border-green-500 bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {pastSlot ? (
                                  <>
                                    Unavailable
                                    <br />
                                    <span className="text-xs font-bold">Past Time</span>
                                  </>
                                ) : maintenanceBlock ? (
                                  <>
                                    Maintenance
                                    <br />
                                    <span className="text-xs font-bold">
                                      {maintenanceBlock.reason || "Unavailable"}
                                    </span>
                                  </>
                                ) : blockingBooking ? (
                                  <>
                                    {normalizeStatus(blockingBooking.status) === "approved"
                                      ? "Booked"
                                      : formatStatusLabel(blockingBooking.status)}
                                    <br />
                                    <span className="text-xs font-bold">
                                      {getRequesterName(blockingBooking)}
                                    </span>
                                    <br />
                                    <span className="text-xs font-bold">
                                      {formatStatusLabel(blockingBooking.payment_status)}
                                    </span>
                                  </>
                                ) : selected ? (
                                  "Selected - Click to Deselect"
                                ) : (
                                  "Open - Click to Select"
                                )}
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

            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#F5F3F1] p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#2B2B2B]">
                  Walk-in Booking Summary
                </p>

                {selectedGroups.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">
                    No time slot selected yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-slate-600">
                    {selectedGroups.slice(0, 5).map((group, index) => (
                      <p key={`${group.facility_id}-${group.start_time}-${index}`}>
                        {group.facility?.name || "Facility"} • {group.label} •{" "}
                        {group.total_hours} hour(s) •{" "}
                        <b>{money(group.total_amount)}</b>
                      </p>
                    ))}

                    {selectedGroups.length > 5 && (
                      <p className="text-xs font-bold text-slate-500">
                        +{selectedGroups.length - 5} more selected booking group(s)
                      </p>
                    )}

                    <p className="pt-1 font-black text-[#2B2B2B]">
                      Total: {selectedSummary.total_hours} hour(s) •{" "}
                      {money(selectedSummary.total_amount)}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openConfirmModal}
                disabled={selectedSlots.length === 0}
                className="rounded-2xl bg-[#C97B6C] px-6 py-4 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Review Walk-in Booking
              </button>
            </div>
          </section>

          {confirmModal && (
            <ConfirmWalkInModal
              form={form}
              groups={selectedGroups}
              summary={selectedSummary}
              submitting={submitting}
              onClose={closeConfirmModal}
              onConfirm={handleSubmitWalkInBooking}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ConfirmWalkInModal({
  form,
  groups,
  summary,
  submitting,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Confirm Walk-in Booking
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Review before creating booking
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Multiple selected slots may create multiple approved and paid booking records.
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
          <ConfirmItem label="Customer" value={form.customer_name} />
          <ConfirmItem label="Contact" value={form.contact_number || "-"} />
          <ConfirmItem label="Date" value={formatDate(form.booking_date)} />
          <ConfirmItem
            label="Session Type"
            value={formatStatusLabel(form.session_type)}
          />
          <ConfirmItem label="Payment Method" value={form.payment_method} />
          <ConfirmItem label="Reference" value={form.payment_reference || "-"} />
          <ConfirmItem label="Total Hours" value={`${summary.total_hours} hour(s)`} />
          <ConfirmItem label="Total Amount" value={money(summary.total_amount)} />
          <ConfirmItem
            label="Amount Paid"
            value={money(form.amount_paid || summary.total_amount)}
          />
          <ConfirmItem label="Booking Records" value={groups.length} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#DED8D2]">
          <div className="border-b border-[#DED8D2] px-4 py-3">
            <h3 className="font-black text-[#2B2B2B]">Selected Schedule</h3>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-4">
            <div className="space-y-3">
              {groups.map((group, index) => (
                <div
                  key={`${group.facility_id}-${group.start_time}-${index}`}
                  className="rounded-2xl bg-[#F5F3F1] p-4 text-sm"
                >
                  <p className="font-black text-[#2B2B2B]">
                    {group.facility?.name || "Facility"}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {group.label} • {group.total_hours} hour(s)
                  </p>
                  <p className="mt-1 text-slate-600">
                    Rate: <b>{money(group.rate_per_hour)}/hr</b> • Total:{" "}
                    <b>{money(group.total_amount)}</b>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-green-50 px-4 py-4 text-sm font-semibold text-green-700">
          This walk-in booking will be automatically marked as approved and paid.
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Walk-in Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      />
    </div>
  );
}

function FilterSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ConfirmItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${color}`}></span>
      {label}
    </span>
  );
}