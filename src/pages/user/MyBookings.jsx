import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  cancelBooking,
  expireBookingReservation,
  submitPaymentProof,
} from "../../services/bookingService";
import { getPaymentSettings } from "../../services/paymentSettingsService";
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
    return new Date(value).toLocaleString();
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
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-yellow-100 text-yellow-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "refunded") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
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
  const minutesLeft = getReservedMinutesLeft(booking);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus) &&
    (minutesLeft === null || minutesLeft > 0)
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
  const [paymentSettings, setPaymentSettings] = useState(null);

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
      reserved: allBookings.filter((b) => normalizeStatus(b.status) === "reserved")
        .length,
      approved: allBookings.filter((b) => normalizeStatus(b.status) === "approved")
        .length,
      expired: allBookings.filter((b) => normalizeStatus(b.status) === "expired")
        .length,
      cancelled: allBookings.filter(
        (b) => normalizeStatus(b.status) === "cancelled"
      ).length,
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
        booking.session_type,
        booking.notes,
        booking.status,
        booking.payment_status,
        booking.payment_reference,
        booking.rejection_reason,
        booking.cancellation_reason,
        booking.payment_rejection_reason,
        booking.id,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [allBookings, search, statusFilter]);

  useEffect(() => {
    if (user?.id) {
      loadBookings();
      loadPaymentSettings();
    }
  }, [user?.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`my-facility-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadBookings()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_settings" },
        () => loadPaymentSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) loadBookings();
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

  async function loadPaymentSettings() {
    try {
      const data = await getPaymentSettings();
      setPaymentSettings(data || null);
    } catch (err) {
      console.error("Failed to load payment settings:", err.message);
    }
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

  async function loadBookings() {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*, facilities (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const didExpire = await autoExpireBookings(data || []);

      if (didExpire) {
        const { data: refreshedData, error: refreshedError } = await supabase
          .from("bookings")
          .select("*, facilities (*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (refreshedError) throw refreshedError;

        setFacilityBookings(refreshedData || []);
        return;
      }

      setFacilityBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    }
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

      await loadBookings();
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
      await loadBookings();
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
          <Topbar title="My Bookings" />

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
                <p className="text-sm font-semibold">My Booking Requests</p>

                <h2 className="mt-2 text-3xl font-black">
                  Track your reservations and payments.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Expired unpaid reservations are automatically updated when this
                  page loads.
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

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by facility, date, status, payment, or booking ID"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All</option>
                  <option value="reserved">Reserved</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  All My Bookings
                </h3>

                <p className="text-sm text-slate-500">
                  Your facility reservations and payment verification status.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {filteredBookings.length} shown
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="text-slate-500">No booking requests found.</p>
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
              paymentSettings={paymentSettings}
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
  const canCancel = ["reserved", "pending"].includes(status);
  const canViewReceipt = status === "approved";
  const canUploadPayment = isReservedPaymentNeeded(booking);

  return (
    <div
      ref={isHighlighted ? highlightedBookingRef : null}
      className={`rounded-2xl border p-5 transition-all duration-300 ${
        isHighlighted
          ? "border-[#C97B6C] bg-[#FFF6F3] shadow-xl ring-4 ring-[#C97B6C]/25"
          : "border-[#DED8D2] bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isHighlighted && (
              <span className="rounded-full bg-[#C97B6C] px-3 py-1 text-xs font-black uppercase text-white">
                Selected Notification
              </span>
            )}

            <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black uppercase text-[#C97B6C]">
              {booking.display_type}
            </span>

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
            {booking.display_title}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {statusMessage(booking)}
          </p>

          {booking.reservation_expires_at && status === "reserved" && (
            <p className="mt-2 text-sm font-bold text-orange-600">
              Reservation expires: {formatDateTime(booking.reservation_expires_at)}
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <PaymentMini label="Total" value={money(finalTotal)} />
            <PaymentMini label="Paid" value={money(booking.amount_paid)} />
            <PaymentMini label="Balance" value={money(getBalance(booking))} />
          </div>

          {booking.payment_reference && (
            <p className="mt-3 text-sm text-slate-600">
              Payment Reference: <b>{booking.payment_reference}</b>
            </p>
          )}

          {paymentStatus === "rejected_payment" &&
            booking.payment_rejection_reason && (
              <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3">
                <p className="text-sm font-black text-red-700">
                  Payment Rejection Reason
                </p>
                <p className="mt-1 text-sm text-red-600">
                  {booking.payment_rejection_reason}
                </p>
              </div>
            )}

          {booking.notes && (
            <p className="mt-3 text-sm text-slate-600">Notes: {booking.notes}</p>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
          >
            View Details
          </button>

          {canUploadPayment && (
            <button
              type="button"
              onClick={onPayment}
              className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
            >
              Upload Payment
            </button>
          )}

          {canViewReceipt && (
            <button
              type="button"
              onClick={onReceipt}
              className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
            >
              View Receipt
            </button>
          )}

          {canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl bg-[#C65B5B] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Cancel Reservation
            </button>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              {status === "expired"
                ? "Expired"
                : status === "cancelled"
                ? "Cancelled"
                : "Reviewed"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({ booking, onClose, onReceipt, onCancel, onPayment }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const totalHours = getTotalHours(booking);
  const ratePerHour = getRatePerHour(booking);
  const finalTotal = getFinalTotal(booking);
  const canCancel = ["reserved", "pending"].includes(status);
  const canUploadPayment = isReservedPaymentNeeded(booking);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#C97B6C]">
              Booking Details
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              {booking.display_title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete details of your facility reservation and payment.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          {statusMessage(booking)}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Booking Status" value={formatStatusLabel(status)} capitalize />
          <DetailItem label="Payment Status" value={formatStatusLabel(paymentStatus)} capitalize />
          <DetailItem label="Facility" value={booking.display_title} />
          <DetailItem label="Booking Date" value={formatDate(booking.booking_date)} />
          <DetailItem label="Time" value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`} />
          <DetailItem label="Session Type" value={booking.session_type || "-"} capitalize />
          <DetailItem label="Total Hours" value={`${totalHours} hour(s)`} />
          <DetailItem label="Rate Per Hour" value={money(ratePerHour)} />
          <DetailItem label="Total Amount" value={money(finalTotal)} />
          <DetailItem label="Amount Paid" value={money(booking.amount_paid)} />
          <DetailItem label="Balance" value={money(getBalance(booking))} />
          <DetailItem label="Payment Method" value={booking.payment_method || "-"} />
          <DetailItem label="Payment Reference" value={booking.payment_reference || "-"} />
          <DetailItem label="Payment Submitted" value={formatDateTime(booking.payment_submitted_at)} />
          <DetailItem label="Reservation Expires" value={formatDateTime(booking.reservation_expires_at)} />
          <DetailItem label="Booking ID" value={booking.id || "-"} />
        </div>

        {booking.payment_proof_url && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-700">Payment Proof</p>

            <a
              href={booking.payment_proof_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-bold text-white hover:bg-[#C97B6C]"
            >
              View Uploaded Screenshot
            </a>
          </div>
        )}

        {paymentStatus === "rejected_payment" && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">
              Payment Rejection Reason
            </p>

            <p className="mt-2 text-sm text-red-600">
              {booking.payment_rejection_reason ||
                "No specific payment rejection reason was provided."}
            </p>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Notes</p>
          <p className="mt-2 text-sm text-slate-600">{booking.notes || "-"}</p>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {canUploadPayment && (
            <button
              type="button"
              onClick={onPayment}
              className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
            >
              Upload Payment Proof
            </button>
          )}

          {status === "approved" && (
            <button
              type="button"
              onClick={onReceipt}
              className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
            >
              View Receipt
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl bg-[#C65B5B] px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              Cancel Reservation
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentProofModal({
  booking,
  paymentSettings,
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
  const finalTotal = getFinalTotal(booking);

  const showGcash =
    paymentSettings?.gcash_name ||
    paymentSettings?.gcash_number ||
    paymentSettings?.gcash_qr_url;

  const showBank =
    paymentSettings?.bank_name ||
    paymentSettings?.bank_account_name ||
    paymentSettings?.bank_account_number ||
    paymentSettings?.bank_qr_url;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-[#2B2B2B]">
          Upload Payment Proof
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Send your payment using the details below, then upload a clear
          screenshot for staff verification.
        </p>

        <div className="mt-5 rounded-2xl bg-[#F5F3F1] p-4">
          <p className="text-sm font-black text-[#2B2B2B]">
            {booking.display_title || booking.facilities?.name || "Facility Booking"}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <p className="mt-3 text-lg font-black text-[#C97B6C]">
            Total Amount: {money(finalTotal)}
          </p>
        </div>

        <section className="mt-5 rounded-2xl border border-[#DED8D2] bg-white p-5">
          <h3 className="text-lg font-black text-[#2B2B2B]">
            Payment Instructions
          </h3>

          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {paymentSettings?.payment_instructions ||
              "Please send your payment using GCash or bank transfer. After payment, upload a clear screenshot showing the amount, date, and reference number."}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {showGcash && (
              <PaymentAccountCard
                title="GCash"
                fields={[
                  ["Account Name", paymentSettings?.gcash_name],
                  ["Number", paymentSettings?.gcash_number],
                ]}
                qrUrl={paymentSettings?.gcash_qr_url}
              />
            )}

            {showBank && (
              <PaymentAccountCard
                title={paymentSettings?.bank_name || "Bank Transfer"}
                fields={[
                  ["Account Name", paymentSettings?.bank_account_name],
                  ["Account Number", paymentSettings?.bank_account_number],
                ]}
                qrUrl={paymentSettings?.bank_qr_url}
              />
            )}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Amount Paid
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
            >
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash Deposit">Cash Deposit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Reference Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Example: 123456789"
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Upload Screenshot
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm outline-none focus:border-[#C97B6C]"
            />

            {file && (
              <p className="mt-2 text-xs font-bold text-green-700">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="min-h-[100px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
          Make sure the amount, receiver, date, and reference number are correct.
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-2xl bg-[#C97B6C] px-5 py-3 font-bold text-white hover:bg-[#B87463] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Payment Proof"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentAccountCard({ title, fields, qrUrl }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-slate-50 p-4">
      <h4 className="text-lg font-black text-[#2B2B2B]">{title}</h4>

      <div className="mt-3 space-y-2">
        {fields.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-xl bg-white px-3 py-2 text-sm"
          >
            <span className="text-slate-500">{label}</span>
            <b className="text-right text-[#2B2B2B]">{value || "-"}</b>
          </div>
        ))}
      </div>

      {qrUrl ? (
        <div className="mt-4 rounded-2xl border border-[#DED8D2] bg-white p-3">
          <img
            src={qrUrl}
            alt={`${title} QR Code`}
            className="mx-auto h-56 w-56 rounded-xl object-contain"
          />
          <p className="mt-2 text-center text-xs font-semibold text-slate-500">
            Scan this QR code to pay.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#DED8D2] bg-white text-sm text-slate-500">
          No QR code uploaded.
        </div>
      )}
    </div>
  );
}

function ReceiptModal({ booking, onClose }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const totalHours = getTotalHours(booking);
  const ratePerHour = getRatePerHour(booking);
  const finalTotal = getFinalTotal(booking);

  function handlePrintReceipt() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Booking Receipt
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Printable Booking Summary
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1]"
          >
            Close
          </button>
        </div>

        <div className="rounded-[24px] border border-[#DED8D2] bg-white p-6 print:border-0 print:p-0">
          <div className="border-b border-[#DED8D2] pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#2B2B2B]">
                  InCredoBall Sports
                </h1>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Facility Booking Receipt
                </p>
              </div>

              <div className="space-y-2 text-right">
                <div className="rounded-2xl bg-green-100 px-4 py-2 text-sm font-black uppercase text-green-700">
                  {formatStatusLabel(status)}
                </div>

                <div className="rounded-2xl bg-green-100 px-4 py-2 text-sm font-black uppercase text-green-700">
                  Payment: {formatStatusLabel(paymentStatus)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReceiptItem label="Booking ID" value={booking.id || "-"} />
            <ReceiptItem label="Receipt Number" value={booking.receipt_number || "-"} />
<ReceiptItem label="Receipt Issued At" value={formatDateTime(booking.receipt_issued_at)} />
            <ReceiptItem label="Status" value={formatStatusLabel(status)} capitalize />
            <ReceiptItem label="Payment Status" value={formatStatusLabel(paymentStatus)} capitalize />
            <ReceiptItem label="Facility" value={booking.display_title} />
            <ReceiptItem label="Date" value={formatLongDate(booking.booking_date)} />
            <ReceiptItem label="Time" value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`} />
            <ReceiptItem label="Session Type" value={booking.session_type || "-"} capitalize />
            <ReceiptItem label="Total Hours" value={`${totalHours} hour(s)`} />
            <ReceiptItem label="Rate Per Hour" value={money(ratePerHour)} />
            <ReceiptItem label="Payment Method" value={booking.payment_method || "-"} />
            <ReceiptItem label="Payment Reference" value={booking.payment_reference || "-"} />
            <ReceiptItem label="Verified At" value={formatDateTime(booking.payment_verified_at)} />
          </div>

          <div className="mt-6 rounded-2xl bg-[#F5F3F1] p-5">
            <div className="space-y-3">
              <ReceiptAmount label="Total Amount" value={money(finalTotal)} />
              <ReceiptAmount label="Amount Paid" value={money(booking.amount_paid)} />
              <ReceiptAmount label="Balance" value={money(getBalance(booking))} />
            </div>
          </div>

          <div className="mt-6 border-t border-[#DED8D2] pt-5">
            <p className="text-xs text-slate-500">
              This receipt confirms that the booking payment has been verified
              and the booking has been approved by staff.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 print:hidden sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrintReceipt}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-[#2B2B2B]">
          Cancel Booking Reservation
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          You can only cancel reservations that are not yet approved.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">
            {booking.display_title || booking.facilities?.name || "Facility Booking"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation"
          className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="rounded-2xl bg-[#C65B5B] px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-[#2B2B2B]">{value}</p>
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

function ReceiptItem({ label, value, capitalize = false }) {
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

function ReceiptAmount({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-black text-[#2B2B2B]">{label}</span>

      <span className="text-xl font-black text-[#C97B6C]">{value}</span>
    </div>
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