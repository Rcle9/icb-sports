import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  ReceiptText,
  RefreshCw,
  Search,
  TimerReset,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

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

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "reserved").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function normalizeCompletionStatus(status) {
  return String(status || "not_completed").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getReservationMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function getStatusBadge(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "icb-badge icb-badge-success";
  if (value === "reserved") return "icb-badge icb-badge-info";
  if (value === "pending") return "icb-badge icb-badge-warning";
  if (value === "rejected") return "icb-badge icb-badge-danger";
  if (value === "cancelled") return "icb-badge icb-badge-muted";
  if (value === "expired") return "icb-badge icb-badge-warning";
  if (value === "completed") return "icb-badge icb-badge-success";

  return "icb-badge icb-badge-muted";
}

function getPaymentBadge(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "icb-badge icb-badge-success";
  if (value === "pending_verification") return "icb-badge icb-badge-info";
  if (value === "unpaid") return "icb-badge icb-badge-warning";
  if (value === "rejected_payment") return "icb-badge icb-badge-danger";
  if (value === "expired") return "icb-badge icb-badge-warning";

  return "icb-badge icb-badge-muted";
}

function getCompletionBadge(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "icb-badge icb-badge-success";
  if (value === "no_show") return "icb-badge icb-badge-warning";
  if (value === "cancelled_late") return "icb-badge icb-badge-danger";

  return "icb-badge icb-badge-muted";
}

function formatCompletionStatus(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "Completed";
  if (value === "no_show") return "No-show";
  if (value === "cancelled_late") return "Cancelled Late";

  return "Not Completed";
}

function getCurrentStep(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);

  if (status === "cancelled") return "Cancelled";
  if (status === "expired" || paymentStatus === "expired") return "Expired";
  if (status === "rejected") return "Rejected";
  if (paymentStatus === "rejected_payment") return "Payment Rejected";
  if (completionStatus !== "not_completed") return formatCompletionStatus(completionStatus);
  if (status === "approved" && paymentStatus === "paid") return "Approved and Paid";
  if (paymentStatus === "pending_verification") return "Payment Review";
  if (status === "reserved") return "Reserved";
  if (status === "pending") return "Pending";

  return formatStatusLabel(status);
}

function buildTimelineItems(booking) {
  const items = [];

  items.push({
    key: "created",
    title: "Booking Created",
    description: "Your facility reservation was submitted.",
    date: booking.created_at,
    icon: CalendarClock,
    status: "done",
  });

  if (booking.reservation_expires_at) {
    const minutesLeft = getReservationMinutesLeft(booking);

    items.push({
      key: "reserved",
      title: "Reservation Timer",
      description:
        minutesLeft !== null && minutesLeft > 0
          ? `Your reserved slot has ${minutesLeft} minute(s) remaining.`
          : "Reservation timer is already finished or expired.",
      date: booking.reservation_expires_at,
      icon: TimerReset,
      status: minutesLeft !== null && minutesLeft > 0 ? "active" : "warning",
    });
  }

  if (booking.payment_date || booking.payment_proof_url) {
    items.push({
      key: "payment_submitted",
      title: "Payment Proof Submitted",
      description: "Your payment proof was uploaded for staff verification.",
      date: booking.payment_date || booking.updated_at,
      icon: CreditCard,
      status: "done",
    });
  }

  if (booking.payment_verified_at) {
    items.push({
      key: "payment_verified",
      title: "Payment Verified",
      description: "Staff verified your payment proof.",
      date: booking.payment_verified_at,
      icon: CheckCircle2,
      status: "done",
    });
  }

  if (booking.payment_rejection_reason) {
    items.push({
      key: "payment_rejected",
      title: "Payment Rejected",
      description: booking.payment_rejection_reason,
      date: booking.updated_at,
      icon: XCircle,
      status: "danger",
    });
  }

  if (normalizeStatus(booking.status) === "approved") {
    items.push({
      key: "approved",
      title: "Booking Approved",
      description: "Your booking is approved and ready for use.",
      date: booking.payment_verified_at || booking.updated_at,
      icon: FileCheck2,
      status: "done",
    });
  }

  if (booking.receipt_number || booking.receipt_issued_at) {
    items.push({
      key: "receipt",
      title: "Receipt Issued",
      description: `Receipt number: ${booking.receipt_number || "-"}`,
      date: booking.receipt_issued_at || booking.payment_verified_at,
      icon: ReceiptText,
      status: "done",
    });
  }

  if (normalizeCompletionStatus(booking.completion_status) !== "not_completed") {
    items.push({
      key: "completion",
      title: formatCompletionStatus(booking.completion_status),
      description: booking.completion_notes || "Booking completion status was updated.",
      date: booking.completed_at || booking.updated_at,
      icon: CalendarCheck,
      status:
        normalizeCompletionStatus(booking.completion_status) === "completed"
          ? "done"
          : "warning",
    });
  }

  if (normalizeStatus(booking.status) === "cancelled") {
    items.push({
      key: "cancelled",
      title: "Booking Cancelled",
      description: booking.cancellation_reason || "This booking was cancelled.",
      date: booking.cancelled_at || booking.updated_at,
      icon: XCircle,
      status: "danger",
    });
  }

  if (normalizeStatus(booking.status) === "rejected") {
    items.push({
      key: "rejected",
      title: "Booking Rejected",
      description: booking.rejection_reason || "This booking was rejected.",
      date: booking.updated_at,
      icon: XCircle,
      status: "danger",
    });
  }

  if (
    normalizeStatus(booking.status) === "expired" ||
    normalizePaymentStatus(booking.payment_status) === "expired"
  ) {
    items.push({
      key: "expired",
      title: "Reservation Expired",
      description: "The reservation expired because payment proof was not submitted on time.",
      date: booking.updated_at || booking.reservation_expires_at,
      icon: Clock,
      status: "warning",
    });
  }

  return items;
}

export default function BookingTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const highlightId =
    searchParams.get("highlight") ||
    searchParams.get("booking_id") ||
    searchParams.get("reference_id");

  const highlightedRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState(highlightId || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);
      const completionStatus = normalizeCompletionStatus(booking.completion_status);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        paymentStatus === statusFilter ||
        completionStatus === statusFilter;

      const searchText = [
        booking.id,
        getFacilityName(booking),
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.status,
        booking.payment_status,
        booking.completion_status,
        booking.payment_reference,
        booking.receipt_number,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const selectedBooking = useMemo(() => {
    if (selectedBookingId) {
      const selected = bookings.find(
        (booking) => String(booking.id) === String(selectedBookingId)
      );

      if (selected) return selected;
    }

    return filteredBookings[0] || null;
  }, [bookings, filteredBookings, selectedBookingId]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      reserved: bookings.filter((booking) => normalizeStatus(booking.status) === "reserved")
        .length,
      paymentReview: bookings.filter(
        (booking) => normalizePaymentStatus(booking.payment_status) === "pending_verification"
      ).length,
      approved: bookings.filter((booking) => normalizeStatus(booking.status) === "approved")
        .length,
    };
  }, [bookings]);

  useEffect(() => {
    if (!user?.id) return;

    loadBookings();

    const channel = supabase
      .channel(`booking-timeline-live-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadBookings(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!highlightId || bookings.length === 0) return;

    const selected = bookings.find(
      (booking) => String(booking.id) === String(highlightId)
    );

    if (selected) {
      setSelectedBookingId(selected.id);

      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);
    }
  }, [highlightId, bookings.length]);

  async function loadBookings(showLoading = true) {
    try {
      if (!user?.id) return;

      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);

      if (!selectedBookingId && data?.length) {
        setSelectedBookingId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking timeline.");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Booking Timeline" subtitle="Customer Portal" />

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <section className="page-hero icb-fade-up mb-6 overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#C97B6C]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

              <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.9fr] xl:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#E8A093]">
                    Booking Progress
                  </p>

                  <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    Track every step of your facility reservation.
                  </h2>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">
                    View reservation creation, payment upload, staff verification,
                    approval, receipt issuance, and completion updates in one timeline.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/my-bookings")}
                      className="icb-btn-accent"
                    >
                      <ReceiptText size={18} />
                      My Bookings
                    </button>

                    <button
                      type="button"
                      onClick={() => loadBookings()}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                    >
                      <RefreshCw size={18} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <HeroStat label="Total" value={stats.total} />
                  <HeroStat label="Reserved" value={stats.reserved} />
                  <HeroStat label="Review" value={stats.paymentReview} />
                  <HeroStat label="Approved" value={stats.approved} />
                </div>
              </div>
            </div>
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-black text-[#0B1F33]">
                  Search Timeline
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by facility, date, status, receipt, or booking ID"
                    className="w-full rounded-2xl border border-[#DED8D2] px-11 py-3 outline-none focus:border-[#C97B6C]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#0B1F33]">
                  Filter Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 font-bold outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All</option>
                  <option value="reserved">Reserved</option>
                  <option value="pending_verification">Payment Review</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="icb-btn-light">
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="icb-card p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                    Booking Records
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Select a booking
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
                    {filteredBookings.length} booking(s) shown.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                  Loading timeline...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6">
                  <h4 className="font-black text-[#0B1F33]">No booking timeline found</h4>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Your booking progress will appear here once you reserve a facility.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/booking")}
                    className="icb-btn-accent mt-4"
                  >
                    Book Facility
                  </button>
                </div>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {filteredBookings.map((booking) => {
                    const selected =
                      selectedBooking &&
                      String(selectedBooking.id) === String(booking.id);

                    const highlighted =
                      highlightId && String(highlightId) === String(booking.id);

                    return (
                      <button
                        key={booking.id}
                        ref={highlighted ? highlightedRef : null}
                        type="button"
                        onClick={() => setSelectedBookingId(booking.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#C97B6C] bg-[#F3E4DF] ring-2 ring-[#C97B6C]/20"
                            : highlighted
                            ? "border-[#C97B6C] bg-white ring-2 ring-[#C97B6C]/20"
                            : "border-[#DED8D2] bg-white hover:border-[#C97B6C]/50 hover:bg-[#FBFAF9]"
                        }`}
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className={getStatusBadge(booking.status)}>
                            {formatStatusLabel(booking.status)}
                          </span>

                          <span className={getPaymentBadge(booking.payment_status)}>
                            {formatStatusLabel(booking.payment_status)}
                          </span>
                        </div>

                        <h4 className="mt-3 text-lg font-black text-[#0B1F33]">
                          {getFacilityName(booking)}
                        </h4>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {formatDate(booking.booking_date)}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>

                        <p className="mt-3 text-sm font-black text-[#C97B6C]">
                          {money(getBookingTotal(booking))}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="icb-card p-5 sm:p-6">
              {!selectedBooking ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center">
                  <h3 className="text-2xl font-black text-[#0B1F33]">
                    Select a booking
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Choose one booking from the left to view its progress timeline.
                  </p>
                </div>
              ) : (
                <BookingTimelineDetails booking={selectedBooking} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function BookingTimelineDetails({ booking }) {
  const timelineItems = buildTimelineItems(booking);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
            Selected Booking
          </p>

          <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={getStatusBadge(booking.status)}>
            {formatStatusLabel(booking.status)}
          </span>

          <span className={getPaymentBadge(paymentStatus)}>
            {formatStatusLabel(paymentStatus)}
          </span>

          <span className={getCompletionBadge(completionStatus)}>
            {formatCompletionStatus(completionStatus)}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniDetail label="Current Step" value={getCurrentStep(booking)} />
        <MiniDetail label="Total Amount" value={money(getBookingTotal(booking))} />
        <MiniDetail label="Amount Paid" value={money(booking.amount_paid || 0)} />
        <MiniDetail label="Receipt" value={booking.receipt_number || "-"} />
      </div>

      {paymentStatus === "rejected_payment" && booking.payment_rejection_reason && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <b>Payment Rejection Reason:</b> {booking.payment_rejection_reason}
        </div>
      )}

      {normalizeStatus(booking.status) === "rejected" && booking.rejection_reason && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <b>Booking Rejection Reason:</b> {booking.rejection_reason}
        </div>
      )}

      {normalizeStatus(booking.status) === "cancelled" && booking.cancellation_reason && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          <b>Cancellation Reason:</b> {booking.cancellation_reason}
        </div>
      )}

      <div className="relative space-y-4">
        {timelineItems.map((item, index) => (
          <TimelineItem
            key={`${item.key}-${index}`}
            item={item}
            last={index === timelineItems.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ item, last }) {
  const Icon = item.icon;

  const iconClass =
    item.status === "done"
      ? "bg-green-100 text-green-700"
      : item.status === "danger"
      ? "bg-red-100 text-red-700"
      : item.status === "warning"
      ? "bg-amber-100 text-amber-700"
      : "bg-[#F3E4DF] text-[#B86658]";

  return (
    <div className="relative flex gap-4">
      {!last && (
        <div className="absolute left-6 top-12 h-[calc(100%+8px)] w-px bg-[#DED8D2]" />
      )}

      <div
        className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        <Icon size={21} />
      </div>

      <div className="flex-1 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="font-black text-[#0B1F33]">{item.title}</h4>

            <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
              {item.description}
            </p>
          </div>

          <p className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {formatDateTime(item.date)}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#0B1F33]">
        {value || "-"}
      </p>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur">
      <p className="text-xs font-black uppercase tracking-widest text-[#E8A093]">
        {label}
      </p>

      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}