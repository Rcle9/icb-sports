import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileImage,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  cancelBooking,
  expireBookingReservation,
  submitPaymentProof,
} from "../../services/bookingService";
import { useAuth } from "../../context/AuthContext";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time24) {
  if (!time24) return "-";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
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
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function normalizeStatus(status) {
  return String(status || "reserved").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getReservedMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();
  const now = Date.now();
  const diff = expiresAt - now;

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

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "refunded") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function statusMessage(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const minutesLeft = getReservedMinutesLeft(booking);

  if (status === "reserved" && paymentStatus === "unpaid") {
    if (minutesLeft !== null && minutesLeft > 0) {
      return `Your slot is reserved. Upload your payment proof within ${minutesLeft} minute(s).`;
    }

    return "Your reservation is expiring. Please refresh if it does not update.";
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "Your payment proof has been submitted. Please wait for staff verification.";
  }

  if (status === "reserved" && paymentStatus === "rejected_payment") {
    if (minutesLeft !== null && minutesLeft > 0) {
      return `Your payment proof was rejected. Upload a valid proof again within ${minutesLeft} minute(s).`;
    }

    return "Your reservation expired after the rejected payment proof.";
  }

  if (status === "approved" && paymentStatus === "paid") {
    return "Your payment has been verified and your booking is approved.";
  }

  if (status === "approved") {
    return "Your booking has been approved. You can now view or print your booking receipt.";
  }

  if (status === "rejected") {
    return "Your booking request was rejected. Check the reason below if provided.";
  }

  if (status === "cancelled") {
    return "This booking request was cancelled.";
  }

  if (status === "expired") {
    return "This reservation expired because payment proof was not submitted on time.";
  }

  if (status === "completed") {
    return "This booking session has been completed.";
  }

  return "Your booking request is waiting for review.";
}

function getFinalTotal(booking) {
  const totalHours = Number(booking.total_hours || 0);
  const ratePerHour = Number(booking.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking.display_total || booking.total_amount || 0) || computedTotal;
}

function getRatePerHour(booking) {
  return Number(booking.display_rate || booking.rate_per_hour || 0);
}

function getTotalHours(booking) {
  return Number(booking.total_hours || 0);
}

function getBalance(booking) {
  const balance = Number(booking.balance_amount || 0);

  if (booking.balance_amount !== null && booking.balance_amount !== undefined) {
    return balance;
  }

  return Math.max(getFinalTotal(booking) - Number(booking.amount_paid || 0), 0);
}

function isReservedPaymentNeeded(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

function canCancelBooking(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    ["reserved", "pending"].includes(status) &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const highlightedId =
    searchParams.get("highlight") ||
    searchParams.get("booking_id") ||
    searchParams.get("reference_id");

  const shouldOpenPayment = searchParams.get("pay") === "1";

  const highlightedBookingRef = useRef(null);
  const autoPaymentOpenedRef = useRef(false);
  const expiringRef = useRef(false);

  const [facilityBookings, setFacilityBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [receiptModal, setReceiptModal] = useState(false);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState(null);

  const [cancelModal, setCancelModal] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentFile, setPaymentFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const allBookings = useMemo(() => {
    return facilityBookings
      .map((booking) => ({
        ...booking,
        booking_source: "facility",
        display_title: booking.facilities?.name || "Facility Booking",
        display_type: "Facility Booking",
        display_rate: booking.rate_per_hour,
        display_total: booking.total_amount,
        source_table: "bookings",
      }))
      .sort((a, b) => {
        return (
          new Date(b.created_at || b.booking_date) -
          new Date(a.created_at || a.booking_date)
        );
      });
  }, [facilityBookings]);

  const stats = useMemo(() => {
    return {
      total: allBookings.length,
      reserved: allBookings.filter((b) => normalizeStatus(b.status) === "reserved")
        .length,
      pending: allBookings.filter((b) => normalizeStatus(b.status) === "pending")
        .length,
      approved: allBookings.filter((b) => normalizeStatus(b.status) === "approved")
        .length,
      expired: allBookings.filter((b) => normalizeStatus(b.status) === "expired")
        .length,
      cancelled: allBookings.filter((b) => normalizeStatus(b.status) === "cancelled")
        .length,
    };
  }, [allBookings]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter((booking) => {
      const status = normalizeStatus(booking.status);

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const searchText = [
        booking.display_title,
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.notes,
        booking.status,
        booking.payment_status,
        booking.payment_reference,
        booking.rejection_reason,
        booking.cancellation_reason,
        booking.payment_rejection_reason,
        booking.receipt_number,
        booking.id,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [allBookings, search, statusFilter]);

  const paymentNeededCount = useMemo(() => {
    return allBookings.filter(isReservedPaymentNeeded).length;
  }, [allBookings]);

  useEffect(() => {
    if (user?.id) loadBookings();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`my-facility-bookings-live-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadBookings(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) loadBookings(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!highlightedId || filteredBookings.length === 0) return;

    const selectedBooking = filteredBookings.find((booking) =>
      bookingMatchesHighlight(booking)
    );

    if (!selectedBooking) return;

    setTimeout(() => {
      highlightedBookingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  }, [highlightedId, filteredBookings]);

  useEffect(() => {
    if (autoPaymentOpenedRef.current) return;
    if (!shouldOpenPayment || !highlightedId || filteredBookings.length === 0) {
      return;
    }

    const selectedBooking = filteredBookings.find((booking) =>
      bookingMatchesHighlight(booking)
    );

    if (!selectedBooking) return;

    if (isReservedPaymentNeeded(selectedBooking)) {
      autoPaymentOpenedRef.current = true;

      setTimeout(() => {
        openPaymentModal(selectedBooking);
      }, 400);
    }
  }, [shouldOpenPayment, highlightedId, filteredBookings]);

  function bookingMatchesHighlight(booking) {
    if (!highlightedId || !booking) return false;

    const possibleIds = [
      booking.id,
      booking.booking_id,
      booking.reference_id,
      booking.linked_booking_id,
      booking.parent_booking_id,
    ]
      .filter(Boolean)
      .map((id) => String(id));

    return possibleIds.includes(String(highlightedId));
  }

  async function autoExpireBookings(bookings) {
    if (expiringRef.current) return false;

    const expiredBookings = (bookings || []).filter(isExpiredReservedBooking);

    if (expiredBookings.length === 0) return false;

    try {
      expiringRef.current = true;

      await Promise.all(
        expiredBookings.map((booking) => expireBookingReservation(booking.id))
      );

      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      expiringRef.current = false;
    }
  }

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*, facilities (*)")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const didExpire = await autoExpireBookings(data || []);

      if (didExpire) {
        const { data: refreshedData, error: refreshedError } = await supabase
          .from("bookings")
          .select("*, facilities (*)")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (refreshedError) throw refreshedError;

        setFacilityBookings(refreshedData || []);
        return;
      }

      setFacilityBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadBookings(false);
  }

  function openDetailsModal(booking) {
    setSelectedBooking(booking);
    setDetailsModal(true);
  }

  function closeDetailsModal() {
    setSelectedBooking(null);
    setDetailsModal(false);
  }

  function openReceiptModal(booking) {
    setSelectedReceiptBooking(booking);
    setReceiptModal(true);
  }

  function closeReceiptModal() {
    setSelectedReceiptBooking(null);
    setReceiptModal(false);
  }

  function openCancelModal(booking) {
    setSelectedCancelBooking(booking);
    setCancelReason("");
    setCancelModal(true);
  }

  function closeCancelModal() {
    setCancelModal(false);
    setSelectedCancelBooking(null);
    setCancelReason("");
  }

  function openPaymentModal(booking) {
    setSelectedPaymentBooking(booking);
    setPaymentAmount(String(getFinalTotal(booking)));
    setPaymentMethod("GCash");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentFile(null);
    setPaymentModal(true);
  }

  function closePaymentModal() {
    setPaymentModal(false);
    setSelectedPaymentBooking(null);
    setPaymentAmount("");
    setPaymentMethod("GCash");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentFile(null);
  }

  async function handleCancel() {
    if (!selectedCancelBooking?.id) return;

    try {
      setCancelling(true);
      setError("");
      setMessage("");

      await cancelBooking(selectedCancelBooking.id, cancelReason);

      setMessage("Booking reservation cancelled successfully.");
      closeCancelModal();
      closeDetailsModal();

      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitPayment() {
    if (!selectedPaymentBooking?.id) return;

    try {
      setSubmittingPayment(true);
      setError("");
      setMessage("");

      await submitPaymentProof(selectedPaymentBooking.id, {
        amount_paid: Number(paymentAmount || 0),
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_notes: paymentNotes,
        file: paymentFile,
      });

      setMessage(
        "Payment proof submitted successfully. Please wait for staff verification."
      );

      closePaymentModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit payment proof.");
    } finally {
      setSubmittingPayment(false);
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
          <Topbar title="My Bookings" subtitle="Track reservations and payments" />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  My Booking Requests
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Track your reservations and payments.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  View booking status, upload payment proof, open receipts, and
                  cancel eligible reservations. Expired unpaid reservations are
                  automatically updated when this page loads.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Reserved" value={stats.reserved} />
                <HeroStat label="Approved" value={stats.approved} />
                <HeroStat label="Expired" value={stats.expired} />
                <HeroStat label="Cancelled" value={stats.cancelled} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MiniStat
              label="Total"
              value={stats.total}
              icon={<ReceiptText size={20} />}
            />
            <MiniStat
              label="Needs Payment"
              value={paymentNeededCount}
              icon={<CreditCard size={20} />}
              tone="blue"
            />
            <MiniStat
              label="Pending"
              value={stats.pending}
              icon={<Clock size={20} />}
              tone="amber"
            />
            <MiniStat
              label="Approved"
              value={stats.approved}
              icon={<CheckCircle2 size={20} />}
              tone="green"
            />
            <MiniStat
              label="Cancelled"
              value={stats.cancelled}
              icon={<XCircle size={20} />}
              tone="red"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Filters</p>
                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Find a booking
                </h3>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="icb-btn-light"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_auto]">
              <div>
                <label className="icb-label flex items-center gap-2">
                  <Search size={16} />
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by facility, date, status, payment, receipt, or booking ID"
                  className="icb-input"
                />
              </div>

              <div>
                <label className="icb-label">Status</label>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="icb-select"
                >
                  <option value="all">All</option>
                  <option value="reserved">Reserved</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="icb-btn-light">
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="icb-card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Booking Records</p>

                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  All My Bookings
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Your facility reservations and payment verification status.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#C97B6C]">
                {filteredBookings.length} shown
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                No booking requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const status = normalizeStatus(booking.status);
                  const isHighlighted = bookingMatchesHighlight(booking);

                  return (
                    <BookingCard
                      key={`${booking.source_table}-${booking.id}`}
                      booking={booking}
                      status={status}
                      isHighlighted={isHighlighted}
                      highlightedBookingRef={highlightedBookingRef}
                      onView={() => openDetailsModal(booking)}
                      onReceipt={() => openReceiptModal(booking)}
                      onCancel={() => openCancelModal(booking)}
                      onPayment={() => openPaymentModal(booking)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {detailsModal && selectedBooking && (
            <BookingDetailsModal
              booking={selectedBooking}
              onClose={closeDetailsModal}
              onReceipt={() => openReceiptModal(selectedBooking)}
              onCancel={() => openCancelModal(selectedBooking)}
              onPayment={() => openPaymentModal(selectedBooking)}
            />
          )}

          {receiptModal && selectedReceiptBooking && (
            <ReceiptModal
              booking={selectedReceiptBooking}
              onClose={closeReceiptModal}
            />
          )}

          {cancelModal && selectedCancelBooking && (
            <CancelBookingModal
              booking={selectedCancelBooking}
              reason={cancelReason}
              setReason={setCancelReason}
              cancelling={cancelling}
              onClose={closeCancelModal}
              onConfirm={handleCancel}
            />
          )}

          {paymentModal && selectedPaymentBooking && (
            <PaymentProofModal
              booking={selectedPaymentBooking}
              amount={paymentAmount}
              setAmount={setPaymentAmount}
              method={paymentMethod}
              setMethod={setPaymentMethod}
              reference={paymentReference}
              setReference={setPaymentReference}
              notes={paymentNotes}
              setNotes={setPaymentNotes}
              file={paymentFile}
              setFile={setPaymentFile}
              submitting={submittingPayment}
              onClose={closePaymentModal}
              onConfirm={handleSubmitPayment}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({
  booking,
  status,
  isHighlighted,
  highlightedBookingRef,
  onView,
  onReceipt,
  onCancel,
  onPayment,
}) {
  const finalTotal = getFinalTotal(booking);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const minutesLeft = getReservedMinutesLeft(booking);
  const canCancel = canCancelBooking(booking);
  const canViewReceipt = status === "approved" || paymentStatus === "paid";
  const canUploadPayment = isReservedPaymentNeeded(booking);

  return (
    <div
      ref={isHighlighted ? highlightedBookingRef : null}
      className={`rounded-[24px] border p-5 transition-all duration-300 ${
        isHighlighted
          ? "border-[#C97B6C] bg-[#FFF6F3] shadow-xl ring-4 ring-[#C97B6C]/25"
          : "border-[#DED8D2] bg-white hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isHighlighted && (
              <span className="rounded-full bg-[#C97B6C] px-3 py-1 text-xs font-black uppercase text-white">
                Selected Notification
              </span>
            )}

            <Badge className="bg-[#F3E4DF] text-[#C97B6C]">
              {booking.display_type}
            </Badge>

            <Badge className={statusClass(status)}>
              {formatStatusLabel(status)}
            </Badge>

            <Badge className={paymentStatusClass(paymentStatus)}>
              Payment: {formatStatusLabel(paymentStatus)}
            </Badge>

            {status === "reserved" &&
              ["unpaid", "rejected_payment"].includes(paymentStatus) &&
              minutesLeft !== null &&
              minutesLeft > 0 && (
                <Badge className="bg-orange-100 text-orange-700">
                  {minutesLeft} min left
                </Badge>
              )}
          </div>

          <h4 className="text-xl font-black text-[#0B1F33]">
            {booking.display_title}
          </h4>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
            {statusMessage(booking)}
          </p>

          {booking.reservation_expires_at && status === "reserved" && (
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-orange-600">
              <Clock size={16} />
              Reservation expires: {formatDateTime(booking.reservation_expires_at)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <PaymentMini label="Total" value={money(finalTotal)} />
            <PaymentMini label="Paid" value={money(booking.amount_paid)} />
            <PaymentMini label="Balance" value={money(getBalance(booking))} />
          </div>

          {paymentStatus === "rejected_payment" &&
            booking.payment_rejection_reason && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3">
                <p className="text-sm font-black text-red-700">
                  Payment Rejection Reason
                </p>
                <p className="mt-1 text-sm font-semibold text-red-600">
                  {booking.payment_rejection_reason}
                </p>
              </div>
            )}
        </div>

        <div className="flex flex-wrap gap-2 xl:w-[190px] xl:flex-col xl:items-stretch">
          <button type="button" onClick={onView} className="icb-btn-light">
            <Eye size={17} />
            View
          </button>

          {canUploadPayment && (
            <button type="button" onClick={onPayment} className="icb-btn-accent">
              <Upload size={17} />
              Payment
            </button>
          )}

          {canViewReceipt && (
            <button type="button" onClick={onReceipt} className="icb-btn-accent">
              <ReceiptText size={17} />
              Receipt
            </button>
          )}

          {canCancel ? (
            <button type="button" onClick={onCancel} className="icb-btn-danger">
              <XCircle size={17} />
              Cancel
            </button>
          ) : (
            <span className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-500">
              {status === "expired"
                ? "Expired"
                : status === "cancelled"
                ? "Cancelled"
                : "Reviewed"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({ booking, onClose, onReceipt, onCancel, onPayment }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const canCancel = canCancelBooking(booking);
  const canUploadPayment = isReservedPaymentNeeded(booking);
  const canViewReceipt = status === "approved" || paymentStatus === "paid";

  return (
    <ModalShell title="Booking Details" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DetailItem label="Facility" value={booking.display_title} />
        <DetailItem label="Booking Date" value={formatLongDate(booking.booking_date)} />
        <DetailItem
          label="Time"
          value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
        />
        <DetailItem label="Total Hours" value={`${getTotalHours(booking)} hour(s)`} />
        <DetailItem label="Rate Per Hour" value={money(getRatePerHour(booking))} />
        <DetailItem label="Total Amount" value={money(getFinalTotal(booking))} />
        <DetailItem label="Amount Paid" value={money(booking.amount_paid)} />
        <DetailItem label="Balance" value={money(getBalance(booking))} />
        <DetailItem label="Booking Status" value={formatStatusLabel(status)} capitalize />
        <DetailItem
          label="Payment Status"
          value={formatStatusLabel(paymentStatus)}
          capitalize
        />
        <DetailItem label="Payment Method" value={booking.payment_method || "-"} />
        <DetailItem label="Payment Reference" value={booking.payment_reference || "-"} />
        <DetailItem label="Receipt Number" value={booking.receipt_number || "-"} />
        <DetailItem
          label="Reservation Expires"
          value={formatDateTime(booking.reservation_expires_at)}
        />
        <DetailItem label="Booking ID" value={booking.id || "-"} />
      </div>

      {booking.payment_proof_url && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-[#0B1F33]">Payment Proof</p>

          <a
            href={booking.payment_proof_url}
            target="_blank"
            rel="noreferrer"
            className="icb-btn-light mt-3"
          >
            <FileImage size={17} />
            View Uploaded Screenshot
          </a>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-black text-[#0B1F33]">Notes</p>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          {booking.notes || "-"}
        </p>
      </div>

      {paymentStatus === "rejected_payment" && (
        <ReasonBox
          title="Payment Rejection Reason"
          value={
            booking.payment_rejection_reason ||
            "No specific payment rejection reason was provided."
          }
          tone="red"
        />
      )}

      {status === "rejected" && booking.rejection_reason && (
        <ReasonBox title="Rejection Reason" value={booking.rejection_reason} tone="red" />
      )}

      {status === "cancelled" && booking.cancellation_reason && (
        <ReasonBox
          title="Cancellation Reason"
          value={booking.cancellation_reason}
          tone="slate"
        />
      )}

      <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
        {canCancel && (
          <button type="button" onClick={onCancel} className="icb-btn-danger">
            Cancel Reservation
          </button>
        )}

        {canUploadPayment && (
          <button type="button" onClick={onPayment} className="icb-btn-accent">
            <Upload size={18} />
            Upload Payment
          </button>
        )}

        {canViewReceipt && (
          <button type="button" onClick={onReceipt} className="icb-btn-accent">
            <ReceiptText size={18} />
            View Receipt
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function ReceiptModal({ booking, onClose }) {
  function handlePrint() {
    window.print();
  }

  return (
    <ModalShell title="Booking Receipt" onClose={onClose} maxWidth="max-w-3xl">
      <div className="rounded-3xl border border-[#DED8D2] bg-white p-6">
        <div className="flex flex-col gap-4 border-b border-[#DED8D2] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C97B6C]">
              InCredoBall Sports
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              Official Booking Receipt
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Receipt No: {booking.receipt_number || booking.id || "-"}
            </p>
          </div>

          <Badge className={statusClass(booking.status)}>
            {formatStatusLabel(booking.status)}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReceiptLine label="Facility" value={booking.display_title} />
          <ReceiptLine label="Date" value={formatLongDate(booking.booking_date)} />
          <ReceiptLine
            label="Time"
            value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
          />
          <ReceiptLine label="Hours" value={`${getTotalHours(booking)} hour(s)`} />
          <ReceiptLine label="Rate" value={`${money(getRatePerHour(booking))} / hour`} />
          <ReceiptLine label="Total" value={money(getFinalTotal(booking))} />
          <ReceiptLine label="Amount Paid" value={money(booking.amount_paid)} />
          <ReceiptLine label="Balance" value={money(getBalance(booking))} />
          <ReceiptLine label="Payment Method" value={booking.payment_method || "-"} />
          <ReceiptLine label="Payment Reference" value={booking.payment_reference || "-"} />
          <ReceiptLine
            label="Payment Status"
            value={formatStatusLabel(booking.payment_status)}
          />
          <ReceiptLine label="Booking ID" value={booking.id || "-"} />
        </div>

        <div className="mt-6 rounded-2xl bg-[#F5F3F1] p-4 text-sm font-semibold text-slate-600">
          Please present this receipt or booking details when you arrive at the
          facility.
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={handlePrint} className="icb-btn-accent">
          <Printer size={18} />
          Print Receipt
        </button>
      </div>
    </ModalShell>
  );
}

function CancelBookingModal({
  booking,
  reason,
  setReason,
  cancelling,
  onClose,
  onConfirm,
}) {
  return (
    <ModalShell title="Cancel Reservation" onClose={onClose} maxWidth="max-w-2xl">
      <div className="rounded-2xl bg-red-50 p-4">
        <p className="text-sm font-black text-red-700">
          Are you sure you want to cancel this booking?
        </p>

        <p className="mt-2 text-sm font-semibold text-red-600">
          {booking.display_title} • {formatDate(booking.booking_date)} •{" "}
          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
        </p>
      </div>

      <div className="mt-5">
        <label className="icb-label">Cancellation Reason</label>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Enter your reason for cancelling this reservation"
          className="icb-textarea"
        />
      </div>

      <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={cancelling}
          className="icb-btn-light"
        >
          Keep Booking
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={cancelling}
          className="icb-btn-danger"
        >
          {cancelling ? "Cancelling..." : "Confirm Cancel"}
        </button>
      </div>
    </ModalShell>
  );
}

function PaymentProofModal({
  booking,
  amount,
  setAmount,
  method,
  setMethod,
  reference,
  setReference,
  notes,
  setNotes,
  file,
  setFile,
  submitting,
  onClose,
  onConfirm,
}) {
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    <ModalShell title="Upload Payment Proof" onClose={onClose}>
      <div className="rounded-2xl bg-[#F5F3F1] p-4">
        <p className="text-sm font-black text-[#0B1F33]">{booking.display_title}</p>

        <p className="mt-1 text-sm font-semibold text-slate-600">
          {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
          {formatTime(booking.end_time)}
        </p>

        <p className="mt-3 text-2xl font-black text-[#C97B6C]">
          Total: {money(getFinalTotal(booking))}
        </p>
      </div>

      {paymentStatus === "rejected_payment" && booking.payment_rejection_reason && (
        <ReasonBox
          title="Previous Payment Rejection Reason"
          value={booking.payment_rejection_reason}
          tone="red"
        />
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="icb-label">Amount Paid</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="icb-input"
          />
        </div>

        <div>
          <label className="icb-label">Payment Method</label>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="icb-select"
          >
            <option value="GCash">GCash</option>
            <option value="Maya">Maya</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="icb-label">Payment Reference Number</label>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Enter reference number"
            className="icb-input"
          />
        </div>

        <div className="md:col-span-2">
          <label className="icb-label">Upload Screenshot / Proof</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-[#DED8D2] bg-white px-4 py-3 text-sm font-bold"
          />

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {file ? `Selected: ${file.name}` : "Upload a clear payment proof image."}
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="icb-label">Notes</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about your payment"
            className="icb-textarea"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="icb-btn-light"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="icb-btn-accent"
        >
          <Upload size={18} />
          {submitting ? "Submitting..." : "Submit Payment Proof"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children, maxWidth = "max-w-5xl" }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0B1F33]/60 px-4 py-6 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">InCredoBall</p>
            <h2 className="mt-1 text-2xl font-black text-[#0B1F33]">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] text-[#0B1F33] transition hover:bg-[#F5F3F1]"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, icon, tone = "navy" }) {
  const tones = {
    navy: "bg-[#F3E4DF] text-[#B86658]",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#0B1F33]">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tones[tone] || tones.navy
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}>
      {children}
    </span>
  );
}

function PaymentMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F5F3F1] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-[#0B1F33]">{value}</p>
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
        className={`mt-2 break-words text-sm font-black text-[#0B1F33] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {String(value || "-")}
      </p>
    </div>
  );
}

function ReceiptLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F5F3F1] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#0B1F33]">{value || "-"}</p>
    </div>
  );
}

function ReasonBox({ title, value, tone = "red" }) {
  const classes =
    tone === "red"
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className={`mt-5 rounded-2xl p-4 ${classes}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}