import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  getAllBookings,
  verifyPayment,
  rejectPayment,
  expireBookingReservation,
} from "../../services/bookingService";

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function cleanTime(time) {
  if (!time) return "08:00";
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

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatLongDate(value) {
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

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getRequesterName(booking) {
  return booking?.profiles?.full_name || "Unknown User";
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getFinalTotal(booking) {
  const totalHours = Number(booking.total_hours || 0);
  const ratePerHour = Number(booking.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking.total_amount || 0) || computedTotal;
}

function getBalance(booking) {
  if (booking.balance_amount !== null && booking.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getFinalTotal(booking) - Number(booking.amount_paid || 0), 0);
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

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
}

function getReservedMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();
  const diff = expiresAt - Date.now();

  if (Number.isNaN(expiresAt)) return null;
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

function canVerifyPayment(booking) {
  return (
    normalizeStatus(booking.status) === "reserved" &&
    normalizePaymentStatus(booking.payment_status) === "pending_verification"
  );
}

function canRejectPayment(booking) {
  return (
    normalizeStatus(booking.status) === "reserved" &&
    normalizePaymentStatus(booking.payment_status) === "pending_verification"
  );
}

function canMarkExpired(booking) {
  return isExpiredReservedBooking(booking);
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function calendarCellClass(booking) {
  if (!booking) return "border-green-500 bg-green-100 text-green-700";

  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  if (status === "approved" && paymentStatus === "paid") {
    return "border-green-600 bg-green-100 text-green-800";
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "border-yellow-500 bg-yellow-100 text-yellow-800";
  }

  if (status === "reserved") {
    return "border-blue-500 bg-blue-100 text-blue-800";
  }

  if (status === "expired") {
    return "border-orange-500 bg-orange-100 text-orange-800";
  }

  if (status === "cancelled") {
    return "border-slate-400 bg-slate-100 text-slate-600";
  }

  if (status === "rejected") {
    return "border-red-500 bg-red-100 text-red-700";
  }

  return "border-slate-400 bg-slate-100 text-slate-700";
}

export default function ManageBookings() {
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get("highlight");
  const highlightedRef = useRef(null);

  const [viewMode, setViewMode] = useState("calendar");
  const [calendarDate, setCalendarDate] = useState(getTodayDate());

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [selectedRejectBooking, setSelectedRejectBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [verifyModal, setVerifyModal] = useState(false);
  const [selectedVerifyBooking, setSelectedVerifyBooking] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationChecklist, setVerificationChecklist] = useState({
    amount_matches: false,
    proof_readable: false,
    reference_visible: false,
    receiver_confirmed: false,
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  const slots = useMemo(() => generateSlots(), []);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      reserved: bookings.filter((booking) => normalizeStatus(booking.status) === "reserved")
        .length,
      paymentReview: bookings.filter(
        (booking) =>
          normalizePaymentStatus(booking.payment_status) ===
          "pending_verification"
      ).length,
      approved: bookings.filter((booking) => normalizeStatus(booking.status) === "approved")
        .length,
      expired: bookings.filter((booking) => normalizeStatus(booking.status) === "expired")
        .length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const matchesPayment =
        paymentFilter === "all" ||
        paymentStatus === normalizePaymentStatus(paymentFilter);

      const matchesFacility =
        facilityFilter === "all" ||
        String(booking.facility_id) === String(facilityFilter);

      const matchesDate =
        !dateFilter || String(booking.booking_date || "") === dateFilter;

      const searchText = [
        booking.id,
        getRequesterName(booking),
        getFacilityName(booking),
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.status,
        booking.payment_status,
        booking.payment_reference,
        booking.payment_method,
        booking.session_type,
        booking.notes,
        booking.rejection_reason,
        booking.cancellation_reason,
        booking.payment_rejection_reason,
        booking.receipt_number,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return (
        matchesStatus &&
        matchesPayment &&
        matchesFacility &&
        matchesDate &&
        matchesSearch
      );
    });
  }, [bookings, search, statusFilter, paymentFilter, facilityFilter, dateFilter]);

  const calendarFacilities = useMemo(() => {
    if (facilityFilter !== "all") {
      return facilities.filter((facility) => String(facility.id) === String(facilityFilter));
    }

    return facilities;
  }, [facilities, facilityFilter]);

 const calendarBookings = useMemo(() => {
  return filteredBookings.filter((booking) => {
    const status = normalizeStatus(booking.status);

    const activeCalendarStatuses = ["reserved", "pending", "approved"];

    return (
      String(booking.booking_date) === String(calendarDate) &&
      activeCalendarStatuses.includes(status)
    );
  });
}, [filteredBookings, calendarDate]);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`staff-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!highlightedId || filteredBookings.length === 0) return;

    setTimeout(() => {
      highlightedRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  }, [highlightedId, filteredBookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      autoExpireVisibleBookings();
    }, 30000);

    return () => clearInterval(interval);
  }, [bookings]);

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const data = await getAllBookings();
      setBookings(data || []);

      const { data: facilityData } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      setFacilities(facilityData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function autoExpireVisibleBookings() {
    const expiredBookings = (bookings || []).filter(isExpiredReservedBooking);

    if (expiredBookings.length === 0) return;

    try {
      await Promise.all(
        expiredBookings.map((booking) => expireBookingReservation(booking.id))
      );

      await loadBookings(false);
    } catch (err) {
      console.error(err);
    }
  }

  function bookingMatchesHighlight(booking) {
    if (!highlightedId) return false;

    return String(booking.id) === String(highlightedId);
  }

  function getCalendarBooking(facilityId, slot) {
    return calendarBookings.find((booking) => {
      if (String(booking.facility_id) !== String(facilityId)) return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      );
    });
  }

  function goToPreviousCalendarDate() {
    const date = new Date(`${calendarDate}T00:00:00`);
    date.setDate(date.getDate() - 1);
    setCalendarDate(date.toISOString().split("T")[0]);
  }

  function goToNextCalendarDate() {
    const date = new Date(`${calendarDate}T00:00:00`);
    date.setDate(date.getDate() + 1);
    setCalendarDate(date.toISOString().split("T")[0]);
  }

  function openDetailsModal(booking) {
    setSelectedBooking(booking);
    setDetailsModal(true);
  }

  function closeDetailsModal() {
    setSelectedBooking(null);
    setDetailsModal(false);
  }

  function openVerifyModal(booking) {
    setSelectedVerifyBooking(booking);
    setVerificationNotes("");
    setVerificationChecklist({
      amount_matches: false,
      proof_readable: false,
      reference_visible: false,
      receiver_confirmed: false,
    });
    setVerifyModal(true);
  }

  function closeVerifyModal() {
    if (processingId) return;

    setVerifyModal(false);
    setSelectedVerifyBooking(null);
    setVerificationNotes("");
    setVerificationChecklist({
      amount_matches: false,
      proof_readable: false,
      reference_visible: false,
      receiver_confirmed: false,
    });
  }

  function toggleVerificationCheck(name) {
    setVerificationChecklist((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  async function handleVerifyPaymentWithChecklist() {
    if (!selectedVerifyBooking?.id) return;

    try {
      setError("");
      setMessage("");
      setProcessingId(selectedVerifyBooking.id);

      await verifyPayment(selectedVerifyBooking.id, {
        checklist: verificationChecklist,
        notes: verificationNotes,
      });

      setMessage("Payment verified successfully. Booking is now approved.");
      closeVerifyModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to verify payment.");
    } finally {
      setProcessingId("");
    }
  }

  function openRejectModal(booking) {
    setSelectedRejectBooking(booking);
    setRejectReason("");
    setRejectModal(true);
  }

  function closeRejectModal() {
    if (processingId) return;

    setSelectedRejectBooking(null);
    setRejectReason("");
    setRejectModal(false);
  }

  async function handleRejectPayment() {
    if (!selectedRejectBooking?.id) return;

    try {
      setError("");
      setMessage("");
      setProcessingId(selectedRejectBooking.id);

      await rejectPayment(selectedRejectBooking.id, rejectReason, {
        checklist: {},
        notes: rejectReason,
      });

      setMessage("Payment proof rejected. User can upload again if reservation is still active.");
      closeRejectModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reject payment.");
    } finally {
      setProcessingId("");
    }
  }

  async function handleMarkExpired(booking) {
    if (!booking?.id) return;

    try {
      setError("");
      setMessage("");
      setProcessingId(booking.id);

      await expireBookingReservation(booking.id);

      setMessage("Reservation marked as expired.");
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to expire reservation.");
    } finally {
      setProcessingId("");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setFacilityFilter("all");
    setDateFilter("");
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Manage Bookings" />

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
                <p className="text-sm font-semibold">Staff Booking Control</p>

                <h2 className="mt-2 text-3xl font-black">
                  Calendar view and payment verification.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  View court availability in calendar format or manage requests in list view.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <HeroStat label="Total" value={stats.total} />
                <HeroStat label="Reserved" value={stats.reserved} />
                <HeroStat label="Review" value={stats.paymentReview} />
                <HeroStat label="Approved" value={stats.approved} />
                <HeroStat label="Expired" value={stats.expired} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`rounded-xl px-5 py-3 text-sm font-black ${
                    viewMode === "calendar"
                      ? "bg-[#C97B6C] text-white"
                      : "text-[#2B2B2B] hover:bg-white"
                  }`}
                >
                  Calendar View
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-xl px-5 py-3 text-sm font-black ${
                    viewMode === "list"
                      ? "bg-[#C97B6C] text-white"
                      : "text-[#2B2B2B] hover:bg-white"
                  }`}
                >
                  List View
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <Legend color="bg-green-100 border-green-500" label="Open" />
                <Legend color="bg-blue-100 border-blue-500" label="Reserved" />
                <Legend color="bg-yellow-100 border-yellow-500" label="Payment Review" />
                <Legend color="bg-green-100 border-green-600" label="Approved/Paid" />
                
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, facility, payment reference, receipt, or booking ID"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <FilterSelect
                label="Booking Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "reserved", label: "Reserved" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "expired", label: "Expired" },
                ]}
              />

              <FilterSelect
                label="Payment"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "unpaid", label: "Unpaid" },
                  {
                    value: "pending_verification",
                    label: "Pending Verification",
                  },
                  { value: "paid", label: "Paid" },
                  { value: "rejected_payment", label: "Rejected Payment" },
                  { value: "expired", label: "Expired" },
                ]}
              />

              <FilterSelect
                label="Facility"
                value={facilityFilter}
                onChange={setFacilityFilter}
                options={[
                  { value: "all", label: "All" },
                  ...facilities.map((facility) => ({
                    value: facility.id,
                    label: facility.name,
                  })),
                ]}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {viewMode === "calendar" ? "Calendar Date" : "List Date"}
                </label>

                <input
                  type="date"
                  value={viewMode === "calendar" ? calendarDate : dateFilter}
                  onChange={(event) =>
                    viewMode === "calendar"
                      ? setCalendarDate(event.target.value)
                      : setDateFilter(event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {viewMode === "calendar" ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Staff Booking Calendar
                  </h3>

                  <p className="text-sm text-slate-500">
                    Click a booked slot to open details and verify payment.
                  </p>

                  <h4 className="mt-4 text-xl font-black text-[#2B2B2B]">
                    {formatLongDate(calendarDate)}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goToPreviousCalendarDate}
                    className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
                  >
                    ‹
                  </button>

                  <input
                    type="date"
                    value={calendarDate}
                    onChange={(event) => setCalendarDate(event.target.value)}
                    className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-bold outline-none focus:border-[#C97B6C]"
                  />

                  <button
                    type="button"
                    onClick={goToNextCalendarDate}
                    className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
                  >
                    ›
                  </button>
                </div>
              </div>

              {calendarFacilities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                  No facilities found.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="w-[140px] border border-[#DED8D2] px-4 py-4 text-left text-[#2B2B2B]">
                          Time
                        </th>

                        {calendarFacilities.map((facility) => (
                          <th
                            key={facility.id}
                            className="border border-[#DED8D2] px-4 py-4 text-center text-[#2B2B2B]"
                          >
                            <div className="font-black">{facility.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {facility.type || "Facility"}
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

                          {calendarFacilities.map((facility) => {
                            const booking = getCalendarBooking(facility.id, slot);

                            return (
                              <td
                                key={`${facility.id}-${slot.label}`}
                                className="border border-[#DED8D2] p-1"
                              >
                                {booking ? (
                                  <button
                                    type="button"
                                    onClick={() => openDetailsModal(booking)}
                                    className={`min-h-[72px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black transition hover:scale-[1.01] ${calendarCellClass(
                                      booking
                                    )}`}
                                  >
                                    <span className="block">
                                      {formatStatusLabel(booking.status)}
                                    </span>
                                    <span className="mt-1 block font-semibold">
                                      {getRequesterName(booking)}
                                    </span>
                                    <span className="mt-1 block font-semibold">
                                      {formatStatusLabel(booking.payment_status)}
                                    </span>
                                  </button>
                                ) : (
                                  <div className="min-h-[72px] rounded-xl border border-green-500 bg-green-100 px-3 py-2 text-center text-xs font-black text-green-700">
                                    Open
                                  </div>
                                )}
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
          ) : (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Booking Requests
                  </h3>

                  <p className="text-sm text-slate-500">
                    Click details to view payment proof and verification actions.
                  </p>
                </div>

                <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                  {filteredBookings.length} shown
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading bookings...</p>
              ) : filteredBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                  No booking requests found.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const highlighted = bookingMatchesHighlight(booking);

                    return (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        highlighted={highlighted}
                        highlightedRef={highlighted ? highlightedRef : null}
                        processing={processingId === booking.id}
                        onView={() => openDetailsModal(booking)}
                        onVerify={() => openVerifyModal(booking)}
                        onReject={() => openRejectModal(booking)}
                        onExpire={() => handleMarkExpired(booking)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {detailsModal && selectedBooking && (
            <BookingDetailsModal
              booking={selectedBooking}
              processing={processingId === selectedBooking.id}
              onClose={closeDetailsModal}
              onVerify={() => openVerifyModal(selectedBooking)}
              onReject={() => openRejectModal(selectedBooking)}
              onExpire={() => handleMarkExpired(selectedBooking)}
            />
          )}

          {verifyModal && selectedVerifyBooking && (
            <PaymentVerificationModal
              booking={selectedVerifyBooking}
              checklist={verificationChecklist}
              notes={verificationNotes}
              setNotes={setVerificationNotes}
              toggleCheck={toggleVerificationCheck}
              processing={processingId === selectedVerifyBooking.id}
              onClose={closeVerifyModal}
              onConfirm={handleVerifyPaymentWithChecklist}
            />
          )}

          {rejectModal && selectedRejectBooking && (
            <RejectPaymentModal
              booking={selectedRejectBooking}
              reason={rejectReason}
              setReason={setRejectReason}
              processing={processingId === selectedRejectBooking.id}
              onClose={closeRejectModal}
              onConfirm={handleRejectPayment}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({
  booking,
  highlighted,
  highlightedRef,
  processing,
  onView,
  onVerify,
  onReject,
  onExpire,
}) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const minutesLeft = getReservedMinutesLeft(booking);

  return (
    <div
      ref={highlightedRef}
      className={`rounded-2xl border p-5 transition ${
        highlighted
          ? "border-[#C97B6C] bg-[#FFF6F3] shadow-xl ring-4 ring-[#C97B6C]/25"
          : "border-[#DED8D2] bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {highlighted && (
              <span className="rounded-full bg-[#C97B6C] px-3 py-1 text-xs font-black uppercase text-white">
                Selected Notification
              </span>
            )}

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                status
              )}`}
            >
              {formatStatusLabel(status)}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(
                paymentStatus
              )}`}
            >
              Payment: {formatStatusLabel(paymentStatus)}
            </span>

            {status === "reserved" &&
              ["unpaid", "rejected_payment"].includes(paymentStatus) &&
              minutesLeft !== null &&
              minutesLeft > 0 && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-700">
                  {minutesLeft} min left
                </span>
              )}
          </div>

          <h4 className="text-xl font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm text-slate-600">
            Customer: <b>{getRequesterName(booking)}</b>
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MiniDetail label="Total" value={money(getFinalTotal(booking))} />
            <MiniDetail label="Paid" value={money(booking.amount_paid)} />
            <MiniDetail label="Balance" value={money(getBalance(booking))} />
            <MiniDetail
              label="Reference"
              value={booking.payment_reference || "-"}
            />
          </div>

          {booking.receipt_number && (
            <p className="mt-3 text-sm font-bold text-green-700">
              Receipt: {booking.receipt_number}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
          >
            View Details
          </button>

          {canVerifyPayment(booking) && (
            <button
              type="button"
              onClick={onVerify}
              disabled={processing}
              className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Verify Payment
            </button>
          )}

          {canRejectPayment(booking) && (
            <button
              type="button"
              onClick={onReject}
              disabled={processing}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Reject Payment
            </button>
          )}

          {canMarkExpired(booking) && (
            <button
              type="button"
              onClick={onExpire}
              disabled={processing}
              className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              Mark Expired
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({
  booking,
  processing,
  onClose,
  onVerify,
  onReject,
  onExpire,
}) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Booking Details
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              {getFacilityName(booking)}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review reservation, payment proof, and verification history.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Booking ID" value={booking.id} />
          <DetailItem label="Customer" value={getRequesterName(booking)} />
          <DetailItem label="Facility" value={getFacilityName(booking)} />
          <DetailItem label="Date" value={formatDate(booking.booking_date)} />
          <DetailItem
            label="Time"
            value={`${formatTime(booking.start_time)} - ${formatTime(
              booking.end_time
            )}`}
          />
          <DetailItem
            label="Session Type"
            value={booking.session_type || "-"}
            capitalize
          />
          <DetailItem
            label="Booking Status"
            value={formatStatusLabel(status)}
            capitalize
          />
          <DetailItem
            label="Payment Status"
            value={formatStatusLabel(paymentStatus)}
            capitalize
          />
          <DetailItem label="Total Amount" value={money(getFinalTotal(booking))} />
          <DetailItem label="Amount Paid" value={money(booking.amount_paid)} />
          <DetailItem label="Balance" value={money(getBalance(booking))} />
          <DetailItem
            label="Payment Method"
            value={booking.payment_method || "-"}
          />
          <DetailItem
            label="Payment Reference"
            value={booking.payment_reference || "-"}
          />
          <DetailItem
            label="Payment Submitted"
            value={formatDateTime(booking.payment_submitted_at)}
          />
          <DetailItem
            label="Reservation Expires"
            value={formatDateTime(booking.reservation_expires_at)}
          />
          <DetailItem
            label="Payment Verified At"
            value={formatDateTime(booking.payment_verified_at)}
          />
          <DetailItem
            label="Receipt Number"
            value={booking.receipt_number || "-"}
          />
          <DetailItem
            label="Receipt Issued At"
            value={formatDateTime(booking.receipt_issued_at)}
          />
        </div>

        {booking.payment_proof_url && (
          <div className="mt-5 rounded-2xl border border-[#DED8D2] bg-slate-50 p-4">
            <p className="text-sm font-black text-[#2B2B2B]">
              Uploaded Payment Proof
            </p>

            <a
              href={booking.payment_proof_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-bold text-white hover:bg-[#C97B6C]"
            >
              Open Screenshot
            </a>
          </div>
        )}

        {booking.payment_verification_result && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-[#2B2B2B]">
              Verification Result
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Result:{" "}
              <b>{formatStatusLabel(booking.payment_verification_result)}</b>
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Notes: {booking.payment_verification_notes || "-"}
            </p>
          </div>
        )}

        {paymentStatus === "rejected_payment" && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">
              Payment Rejection Reason
            </p>

            <p className="mt-2 text-sm text-red-600">
              {booking.payment_rejection_reason ||
                "No specific payment rejection reason provided."}
            </p>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Notes</p>
          <p className="mt-2 text-sm text-slate-600">{booking.notes || "-"}</p>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {canVerifyPayment(booking) && (
            <button
              type="button"
              onClick={onVerify}
              disabled={processing}
              className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Verify Payment
            </button>
          )}

          {canRejectPayment(booking) && (
            <button
              type="button"
              onClick={onReject}
              disabled={processing}
              className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Reject Payment
            </button>
          )}

          {canMarkExpired(booking) && (
            <button
              type="button"
              onClick={onExpire}
              disabled={processing}
              className="rounded-2xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              Mark Expired
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentVerificationModal({
  booking,
  checklist,
  notes,
  setNotes,
  toggleCheck,
  processing,
  onClose,
  onConfirm,
}) {
  const allChecked =
    checklist.amount_matches &&
    checklist.proof_readable &&
    checklist.reference_visible &&
    checklist.receiver_confirmed;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Payment Verification Checklist
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Review proof before approval
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Staff must confirm all items before verifying payment.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-[#F5F3F1] p-4">
          <p className="text-sm font-black text-[#2B2B2B]">
            Booking ID: {booking.id}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Customer: <b>{getRequesterName(booking)}</b>
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Amount Paid: <b>{money(booking.amount_paid)}</b>
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Total Amount: <b>{money(getFinalTotal(booking))}</b>
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Reference: <b>{booking.payment_reference || "-"}</b>
          </p>
        </div>

        {booking.payment_proof_url && (
          <div className="mt-5 rounded-2xl border border-[#DED8D2] bg-slate-50 p-4">
            <p className="text-sm font-black text-[#2B2B2B]">
              Uploaded Payment Proof
            </p>

            <a
              href={booking.payment_proof_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-bold text-white hover:bg-[#C97B6C]"
            >
              Open Screenshot
            </a>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <ChecklistItem
            checked={checklist.amount_matches}
            label="Amount paid matches the total booking amount."
            onClick={() => toggleCheck("amount_matches")}
          />

          <ChecklistItem
            checked={checklist.proof_readable}
            label="Payment proof screenshot is clear and readable."
            onClick={() => toggleCheck("proof_readable")}
          />

          <ChecklistItem
            checked={checklist.reference_visible}
            label="Reference number is visible and matches the submitted reference."
            onClick={() => toggleCheck("reference_visible")}
          />

          <ChecklistItem
            checked={checklist.receiver_confirmed}
            label="Receiver account/name is correct."
            onClick={() => toggleCheck("receiver_confirmed")}
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
            Staff Verification Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about the payment verification"
            className="min-h-[110px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
          />
        </div>

        {!allChecked && (
          <div className="mt-5 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800">
            Complete all checklist items before verifying payment.
          </div>
        )}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={processing || !allChecked}
            className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Verifying..." : "Verify Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectPaymentModal({
  booking,
  reason,
  setReason,
  processing,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-[#2B2B2B]">
          Reject Payment Proof
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Provide a clear reason so the user knows what to upload again.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Customer: <b>{getRequesterName(booking)}</b>
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Reference: <b>{booking.payment_reference || "-"}</b>
          </p>
        </div>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Example: Screenshot is blurry or receiver account is incorrect."
          className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {processing ? "Rejecting..." : "Reject Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        checked
          ? "border-green-500 bg-green-50 text-green-700"
          : "border-[#DED8D2] bg-white text-[#2B2B2B] hover:bg-[#F5F3F1]"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
          checked
            ? "border-green-600 bg-green-600 text-white"
            : "border-slate-300 bg-white text-slate-400"
        }`}
      >
        {checked ? "✓" : ""}
      </span>

      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function DetailItem({ label, value, capitalize = false }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-sm font-bold text-[#2B2B2B] ${
          capitalize ? "capitalize" : ""
        }`}
      >
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

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}