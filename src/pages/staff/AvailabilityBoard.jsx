// src/pages/staff/AvailabilityBoard.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  SearchCheck,
  Wrench,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
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

function addDaysToDateString(dateString, days) {
  const [year, month, day] = String(dateString || getTodayDate())
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
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

const SPORT_FILTERS = [
  { value: "all", label: "All" },
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

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || "User";
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
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

function isPastSlot(date, endTime) {
  const today = getTodayDate();

  if (date < today) return true;
  if (date > today) return false;

  const now = new Date();
  const slotEnd = new Date(`${date}T${cleanTime(endTime)}:00`);

  return slotEnd.getTime() <= now.getTime();
}

function getReservationMinutesLeft(booking) {
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
  const minutesLeft = getReservationMinutesLeft(booking);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus) &&
    minutesLeft !== null &&
    minutesLeft <= 0
  );
}

function isBlockingBooking(booking) {
  const status = normalizeStatus(booking?.status);

  if (!["reserved", "pending", "approved"].includes(status)) return false;
  if (isExpiredReservedBooking(booking)) return false;

  return true;
}

function getSlotState({ booking, maintenanceBlock, selectedDate, slot }) {
  if (maintenanceBlock) {
    return {
      label: "Maintenance",
      description: maintenanceBlock.reason || "Unavailable",
      className: "border-purple-500 bg-purple-100 text-purple-800 hover:bg-purple-200",
      badgeClass: "bg-purple-100 text-purple-800",
    };
  }

  if (booking) {
    const status = normalizeStatus(booking.status);
    const paymentStatus = normalizePaymentStatus(booking.payment_status);

    if (status === "approved" && paymentStatus === "paid") {
      return {
        label: "Booked",
        description: getCustomerName(booking),
        className: "border-slate-400 bg-slate-200 text-slate-700 hover:bg-slate-300",
        badgeClass: "bg-slate-200 text-slate-700",
      };
    }

    if (paymentStatus === "pending_verification") {
      return {
        label: "Payment Review",
        description: getCustomerName(booking),
        className: "border-blue-500 bg-blue-100 text-blue-800 hover:bg-blue-200",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    }

    if (status === "reserved") {
      const minutesLeft = getReservationMinutesLeft(booking);

      return {
        label: "Reserved",
        description:
          minutesLeft !== null ? `${minutesLeft} min left` : getCustomerName(booking),
        className: "border-yellow-500 bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        badgeClass: "bg-yellow-100 text-yellow-800",
      };
    }

    return {
      label: formatStatusLabel(status),
      description: getCustomerName(booking),
      className: "border-slate-400 bg-slate-100 text-slate-700 hover:bg-slate-200",
      badgeClass: "bg-slate-100 text-slate-700",
    };
  }

  if (isPastSlot(selectedDate, slot.end_time)) {
    return {
      label: "Past Time",
      description: "Unavailable",
      className: "border-slate-300 bg-slate-200 text-slate-500",
      badgeClass: "bg-slate-200 text-slate-600",
    };
  }

  return {
    label: "Open",
    description: "Available",
    className: "border-green-500 bg-green-100 text-green-800 hover:bg-green-200",
    badgeClass: "bg-green-100 text-green-800",
  };
}

export default function AvailabilityBoard() {
  const { profile } = useAuth();

  const sidebarRole =
    String(profile?.role || "").toLowerCase() === "admin" ? "admin" : "staff";

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedSportFilter, setSelectedSportFilter] = useState("all");
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const slots = useMemo(() => generateSlots(), []);

  const dayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === selectedDate);
  }, [bookings, selectedDate]);

  const dayMaintenanceBlocks = useMemo(() => {
    return maintenanceBlocks.filter(
      (block) =>
        block.maintenance_date === selectedDate &&
        normalizeStatus(block.status) === "active"
    );
  }, [maintenanceBlocks, selectedDate]);

  const filteredFacilities = useMemo(() => {
    if (selectedSportFilter === "all") return facilities;

    return facilities.filter(
      (facility) => normalizeFacilityType(facility.type) === selectedSportFilter
    );
  }, [facilities, selectedSportFilter]);

  const summary = useMemo(() => {
    let open = 0;
    let reserved = 0;
    let review = 0;
    let booked = 0;
    let maintenance = 0;
    let past = 0;

    filteredFacilities.forEach((facility) => {
      slots.forEach((slot) => {
        const booking = getBookingForSlot(facility.id, slot);
        const block = getMaintenanceForSlot(facility.id, slot);

        const state = getSlotState({
          booking,
          maintenanceBlock: block,
          selectedDate,
          slot,
        });

        if (state.label === "Open") open += 1;
        if (state.label === "Reserved") reserved += 1;
        if (state.label === "Payment Review") review += 1;
        if (state.label === "Booked") booked += 1;
        if (state.label === "Maintenance") maintenance += 1;
        if (state.label === "Past Time") past += 1;
      });
    });

    return {
      open,
      reserved,
      review,
      booked,
      maintenance,
      past,
    };
  }, [filteredFacilities, slots, dayBookings, dayMaintenanceBlocks, selectedDate]);

  useEffect(() => {
    loadBoard();

    const channel = supabase
      .channel(`availability-board-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          loadFacilities(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_maintenance_blocks" },
        () => {
          loadMaintenanceBlocks(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadBoard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      await Promise.all([
        loadFacilities(false),
        loadBookings(false),
        loadMaintenanceBlocks(false),
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load availability board.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFacilities(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setFacilities(data || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (*),
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .order("booking_date", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadMaintenanceBlocks(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("facility_maintenance_blocks")
        .select(`
          *,
          facilities (*)
        `)
        .order("maintenance_date", { ascending: true });

      if (error) throw error;

      setMaintenanceBlocks(data || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadBoard(false);
    } finally {
      setRefreshing(false);
    }
  }

  function getBookingForSlot(facilityId, slot) {
    return dayBookings.find((booking) => {
      if (!isBlockingBooking(booking)) return false;
      if (String(booking.facility_id) !== String(facilityId)) return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      );
    });
  }

  function getMaintenanceForSlot(facilityId, slot) {
    return dayMaintenanceBlocks.find((block) => {
      if (String(block.facility_id) !== String(facilityId)) return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        block.start_time,
        block.end_time
      );
    });
  }

  function goPreviousDay() {
    setSelectedDate((prev) => addDaysToDateString(prev, -1));
    setSelectedSlot(null);
  }

  function goNextDay() {
    setSelectedDate((prev) => addDaysToDateString(prev, 1));
    setSelectedSlot(null);
  }

  function handleDateChange(value) {
    setSelectedDate(value);
    setSelectedSlot(null);
  }

  function handleSportFilterChange(value) {
    setSelectedSportFilter(value);
    setSelectedSlot(null);
  }

  function openSlotDetails(facility, slot) {
    const booking = getBookingForSlot(facility.id, slot);
    const maintenanceBlock = getMaintenanceForSlot(facility.id, slot);

    const state = getSlotState({
      booking,
      maintenanceBlock,
      selectedDate,
      slot,
    });

    setSelectedSlot({
      facility,
      slot,
      booking,
      maintenanceBlock,
      state,
    });
  }

  function closeSlotDetails() {
    setSelectedSlot(null);
  }

  return (
    <div className="page-shell">
      <Sidebar
        role={sidebarRole}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Availability Board"
            subtitle="Live facility schedule monitoring for staff operations."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Live Facility Monitoring
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Facility Availability Board
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  View open slots, reserved sessions, booked schedules, payment
                  reviews, past time slots, and maintenance blocks in real time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <HeroStat label="Open" value={summary.open} tone="green" />
                <HeroStat label="Reserved" value={summary.reserved} tone="amber" />
                <HeroStat label="Review" value={summary.review} tone="blue" />
                <HeroStat label="Booked" value={summary.booked} tone="slate" />
                <HeroStat
                  label="Maintenance"
                  value={summary.maintenance}
                  tone="purple"
                />
                <HeroStat label="Past" value={summary.past} tone="muted" />
              </div>
            </div>
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="icb-eyebrow">Board Controls</p>

                <h3 className="icb-section-title mt-2">
                  {formatDate(selectedDate)}
                </h3>

                <p className="icb-section-subtitle">
                  Select a date and sport type to check each facility’s time slot
                  availability.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goPreviousDay}
                  className="icb-btn-light"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="relative">
                  <Calendar
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => handleDateChange(event.target.value)}
                    className="icb-input w-auto min-w-[190px] pl-11"
                  />
                </div>

                <button
                  type="button"
                  onClick={goNextDay}
                  className="icb-btn-light"
                  aria-label="Next day"
                >
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
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

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
              <Legend color="bg-green-100 border-green-500" label="Open" />
              <Legend color="bg-yellow-100 border-yellow-500" label="Reserved" />
              <Legend color="bg-blue-100 border-blue-500" label="Payment Review" />
              <Legend color="bg-slate-200 border-slate-400" label="Booked / Paid" />
              <Legend color="bg-purple-100 border-purple-500" label="Maintenance" />
              <Legend color="bg-slate-200 border-slate-300" label="Past Time" />
            </div>
          </section>

          <section className="icb-card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Schedule Grid</p>

                <h3 className="icb-section-title mt-2">Facility Time Slots</h3>

                <p className="icb-section-subtitle">
                  Click any slot to view its details, booking information, or
                  maintenance reason.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F3E4DF] px-4 py-3 text-sm font-black text-[#B86658]">
                {filteredFacilities.length} facility
                {filteredFacilities.length === 1 ? "" : "ies"} shown
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-sm font-semibold text-slate-500">
                Loading availability board...
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
                          <div className="safe-text font-black">{facility.name}</div>

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
                          const booking = getBookingForSlot(facility.id, slot);
                          const maintenanceBlock = getMaintenanceForSlot(
                            facility.id,
                            slot
                          );

                          const state = getSlotState({
                            booking,
                            maintenanceBlock,
                            selectedDate,
                            slot,
                          });

                          return (
                            <td
                              key={`${facility.id}-${slot.index}`}
                              className="border border-[#DED8D2] bg-white p-1"
                            >
                              <button
                                type="button"
                                onClick={() => openSlotDetails(facility, slot)}
                                className={`min-h-[82px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black transition ${state.className}`}
                              >
                                {state.label}
                                <br />

                                <span className="text-xs font-bold">
                                  {state.description}
                                </span>

                                {maintenanceBlock && (
                                  <>
                                    <br />
                                    <span className="inline-flex items-center justify-center gap-1 text-xs">
                                      <Wrench size={12} />
                                      Maintenance
                                    </span>
                                  </>
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
          </section>

          {selectedSlot && (
            <SlotDetailsModal data={selectedSlot} onClose={closeSlotDetails} />
          )}
        </div>
      </main>
    </div>
  );
}

function SlotDetailsModal({ data, onClose }) {
  const { facility, slot, booking, maintenanceBlock, state } = data;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="icb-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">Slot Details</p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              {facility.name}
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {slot.label}
            </p>
          </div>

          <button type="button" onClick={onClose} className="icb-btn-light">
            Close
          </button>
        </div>

        <div className="mt-5">
          <span
            className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase ${state.badgeClass}`}
          >
            {state.label}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailItem label="Facility" value={facility.name} />
          <DetailItem label="Rate" value={`${money(getFacilityRate(facility))}/hr`} />
          <DetailItem label="Start Time" value={formatTime(slot.start_time)} />
          <DetailItem label="End Time" value={formatTime(slot.end_time)} />

          {booking && (
            <>
              <DetailItem label="Customer" value={getCustomerName(booking)} />
              <DetailItem
                label="Source"
                value={booking.is_walk_in ? "Walk-in" : "Online"}
              />
              <DetailItem
                label="Booking Status"
                value={formatStatusLabel(booking.status)}
              />
              <DetailItem
                label="Payment Status"
                value={formatStatusLabel(booking.payment_status)}
              />
              <DetailItem label="Receipt" value={booking.receipt_number || "-"} />
              <DetailItem label="Amount Paid" value={money(booking.amount_paid)} />
            </>
          )}

          {maintenanceBlock && (
            <>
              <DetailItem
                label="Maintenance Reason"
                value={maintenanceBlock.reason || "Facility maintenance"}
              />
              <DetailItem
                label="Maintenance Status"
                value={formatStatusLabel(maintenanceBlock.status)}
              />
            </>
          )}

          {!booking && !maintenanceBlock && (
            <DetailItem
              label="Availability"
              value={state.label === "Open" ? "Available for booking" : state.label}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
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

function HeroStat({ label, value, tone = "navy" }) {
  const toneClasses = {
    navy: "bg-white/15 text-white",
    green: "bg-green-500/20 text-white",
    amber: "bg-yellow-500/20 text-white",
    blue: "bg-blue-500/20 text-white",
    slate: "bg-white/15 text-white",
    purple: "bg-purple-500/20 text-white",
    muted: "bg-white/10 text-white",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClasses[tone] || toneClasses.navy}`}>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="mt-2 text-2xl font-black">{value}</h3>
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