import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { cancelBooking } from "../../services/bookingService";
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

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

function statusMessage(status) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return "Your booking has been approved. You can now view or print your booking receipt.";
  }

  if (value === "rejected") {
    return "Your booking request was rejected. Check the reason below if provided.";
  }

  if (value === "cancelled") {
    return "This booking request was cancelled.";
  }

  return "Your booking request is still pending and waiting for staff approval.";
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

export default function MyBookings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const highlightedId =
    searchParams.get("highlight") ||
    searchParams.get("booking_id") ||
    searchParams.get("reference_id");

  const highlightedBookingRef = useRef(null);

  const [facilityBookings, setFacilityBookings] = useState([]);
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
      pending: allBookings.filter((b) => normalizeStatus(b.status) === "pending")
        .length,
      approved: allBookings.filter(
        (b) => normalizeStatus(b.status) === "approved"
      ).length,
      rejected: allBookings.filter(
        (b) => normalizeStatus(b.status) === "rejected"
      ).length,
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
        booking.rejection_reason,
        booking.cancellation_reason,
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
    if (user?.id) loadBookings();
  }, [user?.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`my-facility-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  async function handleCancel() {
    if (!selectedCancelBooking?.id) return;

    try {
      setCancelling(true);
      setError("");
      setMessage("");

      await cancelBooking(selectedCancelBooking.id, cancelReason);

      setMessage("Booking request cancelled successfully.");
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
                  Track all facility booking requests.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  View booking details, status updates, cancellation reasons, and
                  printable receipts for approved bookings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Pending" value={stats.pending} />
                <HeroStat label="Approved" value={stats.approved} />
                <HeroStat label="Rejected" value={stats.rejected} />
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
                  placeholder="Search by facility, date, status, notes, or booking ID"
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
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
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
                  Your facility booking requests.
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
}) {
  const finalTotal = getFinalTotal(booking);
  const canCancel = status === "pending";
  const canViewReceipt = status === "approved";

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
        <div className="min-w-0">
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
              {status}
            </span>
          </div>

          <h4 className="text-xl font-black text-[#2B2B2B]">
            {booking.display_title}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {statusMessage(status)}
          </p>

          {booking.session_type && (
            <p className="mt-3 text-sm">
              Session Type:{" "}
              <b className="capitalize">{booking.session_type}</b>
            </p>
          )}

          {booking.notes && (
            <p className="mt-2 text-sm text-slate-600">Notes: {booking.notes}</p>
          )}

          {status === "rejected" && booking.rejection_reason && (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3">
              <p className="text-sm font-black text-red-700">
                Rejection Reason
              </p>
              <p className="mt-1 text-sm text-red-600">
                {booking.rejection_reason}
              </p>
            </div>
          )}

          {status === "cancelled" && booking.cancellation_reason && (
            <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-sm font-black text-slate-700">
                Cancellation Reason
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {booking.cancellation_reason}
              </p>
            </div>
          )}

          <p className="mt-3 text-sm font-black">Total: {money(finalTotal)}</p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
          >
            View Details
          </button>

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
              Cancel Request
            </button>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              {status === "cancelled" ? "Cancelled" : "Reviewed"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({ booking, onClose, onReceipt, onCancel }) {
  const status = normalizeStatus(booking.status);
  const totalHours = getTotalHours(booking);
  const ratePerHour = getRatePerHour(booking);
  const finalTotal = getFinalTotal(booking);

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
              Complete details of your facility reservation request.
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
          {statusMessage(status)}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Status" value={status} capitalize />
          <DetailItem label="Facility" value={booking.display_title} />
          <DetailItem label="Booking Date" value={formatDate(booking.booking_date)} />
          <DetailItem
            label="Time"
            value={`${formatTime(booking.start_time)} - ${formatTime(
              booking.end_time
            )}`}
          />
          <DetailItem label="Session Type" value={booking.session_type || "-"} capitalize />
          <DetailItem label="Total Hours" value={`${totalHours} hour(s)`} />
          <DetailItem label="Rate Per Hour" value={money(ratePerHour)} />
          <DetailItem label="Total Amount" value={money(finalTotal)} />
          <DetailItem
            label="Facility Approval"
            value={booking.facility_approval_status || "-"}
            capitalize
          />
          <DetailItem label="Booking ID" value={booking.id || "-"} />
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Notes</p>
          <p className="mt-2 text-sm text-slate-600">{booking.notes || "-"}</p>
        </div>

        {status === "rejected" && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">
              Rejection Reason
            </p>
            <p className="mt-2 text-sm text-red-600">
              {booking.rejection_reason || "No specific reason was provided."}
            </p>
          </div>
        )}

        {status === "cancelled" && (
          <div className="mt-5 rounded-2xl bg-slate-100 p-4">
            <p className="text-sm font-black text-slate-700">
              Cancellation Reason
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {booking.cancellation_reason || "No specific reason was provided."}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {status === "approved" && (
            <button
              type="button"
              onClick={onReceipt}
              className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
            >
              View Receipt
            </button>
          )}

          {status === "pending" && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl bg-[#C65B5B] px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              Cancel Request
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

function ReceiptModal({ booking, onClose }) {
  const status = normalizeStatus(booking.status);
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

            <p className="mt-1 text-sm text-slate-500">
              You can print this receipt or save it as PDF from the print window.
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

        <div
          id="booking-receipt"
          className="rounded-[24px] border border-[#DED8D2] bg-white p-6 print:border-0 print:p-0"
        >
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

              <div className="rounded-2xl bg-green-100 px-4 py-2 text-sm font-black uppercase text-green-700">
                {status}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReceiptItem label="Booking ID" value={booking.id || "-"} />
            <ReceiptItem label="Status" value={status} capitalize />
            <ReceiptItem label="Facility" value={booking.display_title} />
            <ReceiptItem label="Date" value={formatLongDate(booking.booking_date)} />
            <ReceiptItem
              label="Time"
              value={`${formatTime(booking.start_time)} - ${formatTime(
                booking.end_time
              )}`}
            />
            <ReceiptItem label="Session Type" value={booking.session_type || "-"} capitalize />
            <ReceiptItem label="Total Hours" value={`${totalHours} hour(s)`} />
            <ReceiptItem label="Rate Per Hour" value={money(ratePerHour)} />
          </div>

          <div className="mt-6 rounded-2xl bg-[#F5F3F1] p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-lg font-black text-[#2B2B2B]">
                Total Amount
              </span>

              <span className="text-3xl font-black text-[#C97B6C]">
                {money(finalTotal)}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-700">Notes</p>
            <p className="mt-2 text-sm text-slate-600">
              {booking.notes || "No notes provided."}
            </p>
          </div>

          <div className="mt-6 border-t border-[#DED8D2] pt-5">
            <p className="text-xs text-slate-500">
              This receipt confirms that the booking request has been approved by
              staff. Please present this summary if needed during your scheduled
              facility use.
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
          Cancel Booking Request
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          You can only cancel requests that are still pending.
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

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}