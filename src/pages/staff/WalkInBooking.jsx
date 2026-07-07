// src/pages/staff/WalkInBooking.jsx

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  RefreshCw,
  SearchCheck,
  UserRound,
  Wallet,
} from "lucide-react";
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
  const facilityMap = new Map(
    facilities.map((facility) => [String(facility.id), facility])
  );

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
      const sameFacility =
        String(lastGroup?.facility_id) === String(item.facility_id);
      const continuous = lastGroup?.end_time === item.slot.start_time;

      if (lastGroup && sameFacility && continuous) {
        lastGroup.slots.push(item.slot);
        lastGroup.end_time = item.slot.end_time;
        lastGroup.label = `${formatTime(lastGroup.start_time)} - ${formatTime(
          lastGroup.end_time
        )}`;
        lastGroup.total_hours = hoursBetween(
          lastGroup.start_time,
          lastGroup.end_time
        );
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [refreshing, setRefreshing] = useState(false);

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

  const boardSummary = useMemo(() => {
    let open = 0;
    let selected = 0;
    let blocked = 0;
    let maintenance = 0;
    let past = 0;

    filteredFacilities.forEach((facility) => {
      slots.forEach((slot) => {
        const pastSlot = isPastSlot(form.booking_date, slot);
        const maintenanceBlock = getMaintenanceBlock(facility.id, slot);
        const blockingBooking = getBlockingBooking(facility.id, slot);
        const selectedSlot = isSlotSelected(facility.id, slot);

        if (selectedSlot) selected += 1;
        else if (pastSlot) past += 1;
        else if (maintenanceBlock) maintenance += 1;
        else if (blockingBooking) blocked += 1;
        else open += 1;
      });
    });

    return {
      open,
      selected,
      blocked,
      maintenance,
      past,
    };
  }, [
    filteredFacilities,
    slots,
    form.booking_date,
    selectedSlots,
    bookingsForDate,
    maintenanceBlocks,
  ]);

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

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadScheduleForDate(false);
      await loadMaintenanceBlocksForDate(false);
    } finally {
      setRefreshing(false);
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
        throw new Error(
          "Amount paid must be equal to or greater than the total amount."
        );
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

    const nextValue = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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

    const nextValue = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    setForm((prev) => ({
      ...prev,
      booking_date: nextValue,
    }));

    setSelectedSlots([]);
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="staff"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Walk-in Booking"
            subtitle="Create approved facility bookings for on-site customers."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Staff Walk-in Booking
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Create approved bookings for walk-in customers.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Select available facility slots, record customer details, and
                  create paid booking records directly from the staff portal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Selected" value={selectedSummary.total_slots} />
                <HeroStat label="Groups" value={selectedSummary.total_groups} />
                <HeroStat
                  label="Total Hours"
                  value={selectedSummary.total_hours}
                />
                <HeroStat
                  label="Total Amount"
                  value={money(selectedSummary.total_amount)}
                />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Open Slots"
              value={boardSummary.open}
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />

            <MetricCard
              label="Selected Slots"
              value={boardSummary.selected}
              icon={<CalendarDays size={22} />}
              tone="coral"
            />

            <MetricCard
              label="Booked / Reserved"
              value={boardSummary.blocked}
              icon={<Clock size={22} />}
              tone="blue"
            />

            <MetricCard
              label="Maintenance"
              value={boardSummary.maintenance}
              icon={<FileText size={22} />}
              tone="purple"
            />

            <MetricCard
              label="Past Time"
              value={boardSummary.past}
              icon={<Clock size={22} />}
              tone="slate"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="icb-eyebrow">Customer Details</p>

                <h3 className="icb-section-title mt-2">
                  Customer and Payment Information
                </h3>

                <p className="icb-section-subtitle">
                  Walk-in bookings are automatically marked as approved and paid.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="icb-btn-light w-full disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh Schedule"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InputField
                label="Customer Name"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Enter customer name"
                icon={<UserRound size={18} />}
              />

              <InputField
                label="Contact Number"
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                placeholder="Optional contact number"
                icon={<UserRound size={18} />}
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
                icon={<CreditCard size={18} />}
              />

              <InputField
                label="Amount Paid"
                name="amount_paid"
                type="number"
                value={form.amount_paid}
                onChange={handleChange}
                placeholder={String(selectedSummary.total_amount || 0)}
                icon={<Wallet size={18} />}
              />

              <div className="lg:col-span-3">
                <label className="icb-label">Notes</label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes"
                  className="icb-textarea"
                />
              </div>
            </div>
          </section>

          <section className="icb-card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="icb-eyebrow">Schedule Selection</p>

                <h3 className="icb-section-title mt-2">
                  Select Walk-in Schedule
                </h3>

                <p className="icb-section-subtitle">
                  Choose one or more available slots. Each court or table is
                  shown as a separate column.
                </p>

                <h4 className="mt-5 text-xl font-black text-[#0B1F33]">
                  {formatDate(form.booking_date)}
                </h4>

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                  <Legend color="bg-green-100 border-green-500" label="Open" />
                  <Legend
                    color="bg-[#F3E4DF] border-[#C97B6C]"
                    label="Selected"
                  />
                  <Legend color="bg-blue-100 border-blue-500" label="Reserved" />
                  <Legend
                    color="bg-yellow-100 border-yellow-500"
                    label="Payment Review"
                  />
                  <Legend
                    color="bg-slate-200 border-slate-400"
                    label="Booked / Paid"
                  />
                  <Legend
                    color="bg-purple-100 border-purple-500"
                    label="Maintenance"
                  />
                  <Legend
                    color="bg-slate-200 border-slate-400"
                    label="Past Time"
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
                  <p className="mb-4 flex items-center gap-2 text-sm font-black text-[#0B1F33]">
                    <SearchCheck size={17} />
                    Sport Filter
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {SPORT_FILTERS.map((sport) => (
                      <button
                        key={sport.value}
                        type="button"
                        onClick={() => handleSportFilterChange(sport.value)}
                        className={
                          selectedSportFilter === sport.value
                            ? "icb-btn-accent"
                            : "icb-btn-light"
                        }
                      >
                        {sport.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousDate}
                  disabled={form.booking_date <= getTodayDate()}
                  className="icb-btn-light disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous date"
                >
                  <ChevronLeft size={18} />
                </button>

                <input
                  type="date"
                  name="booking_date"
                  value={form.booking_date}
                  min={getTodayDate()}
                  onChange={handleChange}
                  className="icb-input w-auto min-w-[190px]"
                />

                <button
                  type="button"
                  onClick={goToNextDate}
                  className="icb-btn-light"
                  aria-label="Next date"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-sm font-semibold text-slate-500">
                Loading walk-in booking...
              </div>
            ) : filteredFacilities.length === 0 ? (
              <EmptyState text="No facilities found for this sport type." />
            ) : (
              <div className="calendar-scroll overflow-x-auto rounded-2xl border border-[#DED8D2]">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F5F3F1]">
                      <th className="w-[160px] border border-[#DED8D2] px-4 py-4 text-left text-[#0B1F33]">
                        Time
                      </th>

                      {filteredFacilities.map((facility) => (
                        <th
                          key={facility.id}
                          className="border border-[#DED8D2] px-4 py-4 text-center text-[#0B1F33]"
                        >
                          <div className="safe-text font-black">
                            {facility.name}
                          </div>

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
                        <td className="border border-[#DED8D2] bg-white px-4 py-4 font-black text-[#0B1F33]">
                          <div className="flex items-center gap-2">
                            <Clock size={15} className="text-[#C97B6C]" />
                            {slot.label}
                          </div>
                        </td>

                        {filteredFacilities.map((facility) => {
                          const pastSlot = isPastSlot(form.booking_date, slot);
                          const maintenanceBlock = getMaintenanceBlock(
                            facility.id,
                            slot
                          );
                          const blockingBooking = getBlockingBooking(
                            facility.id,
                            slot
                          );
                          const selected = isSlotSelected(facility.id, slot);

                          const blocked =
                            pastSlot ||
                            Boolean(maintenanceBlock) ||
                            Boolean(blockingBooking);

                          return (
                            <td
                              key={`${facility.id}-${slot.index}`}
                              className="border border-[#DED8D2] bg-white p-1"
                            >
                              <button
                                type="button"
                                disabled={blocked || loadingSchedule}
                                onClick={() => handleSlotSelect(facility, slot)}
                                className={`min-h-[78px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black transition ${
                                  blocked
                                    ? pastSlot
                                      ? "cursor-not-allowed border-slate-400 bg-slate-200 text-slate-600"
                                      : maintenanceBlock
                                      ? "cursor-not-allowed border-purple-500 bg-purple-100 text-purple-800"
                                      : `cursor-not-allowed ${getBlockedClass(
                                          blockingBooking
                                        )}`
                                    : selected
                                    ? "border-[#C97B6C] bg-[#F3E4DF] text-[#B86658] ring-2 ring-[#C97B6C]/25"
                                    : "border-green-500 bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {pastSlot ? (
                                  <>
                                    Unavailable
                                    <br />
                                    <span className="text-xs font-bold">
                                      Past Time
                                    </span>
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
                                    {normalizeStatus(blockingBooking.status) ===
                                    "approved"
                                      ? "Booked"
                                      : formatStatusLabel(blockingBooking.status)}
                                    <br />
                                    <span className="text-xs font-bold">
                                      {getRequesterName(blockingBooking)}
                                    </span>
                                    <br />
                                    <span className="text-xs font-bold">
                                      {formatStatusLabel(
                                        blockingBooking.payment_status
                                      )}
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

            <div className="mt-6 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="icb-eyebrow">Booking Summary</p>

                  <h3 className="mt-2 text-xl font-black text-[#0B1F33]">
                    Walk-in Booking Summary
                  </h3>

                  {selectedGroups.length === 0 ? (
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      No time slot selected yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                      {selectedGroups.slice(0, 5).map((group, index) => (
                        <p key={`${group.facility_id}-${group.start_time}-${index}`}>
                          <span className="font-black text-[#0B1F33]">
                            {group.facility?.name || "Facility"}
                          </span>{" "}
                          • {group.label} • {group.total_hours} hour(s) •{" "}
                          <b className="text-[#B86658]">
                            {money(group.total_amount)}
                          </b>
                        </p>
                      ))}

                      {selectedGroups.length > 5 && (
                        <p className="text-xs font-bold text-slate-500">
                          +{selectedGroups.length - 5} more selected booking
                          group(s)
                        </p>
                      )}

                      <p className="pt-2 text-base font-black text-[#0B1F33]">
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
                  className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Review Walk-in Booking
                </button>
              </div>
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="icb-card max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">Confirm Walk-in Booking</p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              Review before creating booking
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Multiple selected slots may create multiple approved and paid
              booking records.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="icb-btn-light disabled:opacity-60"
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
          <ConfirmItem
            label="Total Hours"
            value={`${summary.total_hours} hour(s)`}
          />
          <ConfirmItem label="Total Amount" value={money(summary.total_amount)} />
          <ConfirmItem
            label="Amount Paid"
            value={money(form.amount_paid || summary.total_amount)}
          />
          <ConfirmItem label="Booking Records" value={groups.length} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#DED8D2]">
          <div className="border-b border-[#DED8D2] px-4 py-3">
            <h3 className="font-black text-[#0B1F33]">Selected Schedule</h3>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-4">
            <div className="space-y-3">
              {groups.map((group, index) => (
                <div
                  key={`${group.facility_id}-${group.start_time}-${index}`}
                  className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4 text-sm"
                >
                  <p className="safe-text font-black text-[#0B1F33]">
                    {group.facility?.name || "Facility"}
                  </p>

                  <p className="mt-1 font-semibold text-slate-600">
                    {group.label} • {group.total_hours} hour(s)
                  </p>

                  <p className="mt-1 font-semibold text-slate-600">
                    Rate: <b>{money(group.rate_per_hour)}/hr</b> • Total:{" "}
                    <b className="text-[#B86658]">{money(group.total_amount)}</b>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="icb-alert-success mt-5">
          This walk-in booking will be automatically marked as approved and paid.
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="icb-btn-light disabled:opacity-60"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
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
  icon,
}) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`icb-input ${icon ? "pl-11" : ""}`}
        />
      </div>
    </div>
  );
}

function FilterSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <select name={name} value={value} onChange={onChange} className="icb-select">
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
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="safe-text mt-2 text-sm font-black text-[#0B1F33]">
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

function MetricCard({ label, value, icon, tone = "coral" }) {
  const toneClasses = {
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>

          <h3 className="mt-3 text-3xl font-black text-[#0B1F33]">{value}</h3>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            toneClasses[tone] || toneClasses.coral
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}