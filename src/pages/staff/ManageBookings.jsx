import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  getAllBookings,
  approveBooking,
  rejectBooking,
} from "../../services/bookingService";

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
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

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
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
      label: `${formatTime(start)}-${formatTime(end)}`,
    };
  });
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return (
    cleanTime(aStart) < cleanTime(bEnd) &&
    cleanTime(aEnd) > cleanTime(bStart)
  );
}

function getRequesterName(booking) {
  return booking?.profiles?.full_name || "Unknown User";
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getTotalHours(booking) {
  return Number(booking?.total_hours || 0);
}

function getRatePerHour(booking) {
  return Number(booking?.rate_per_hour || 0);
}

function getFinalTotal(booking) {
  const totalHours = getTotalHours(booking);
  const ratePerHour = getRatePerHour(booking);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computedTotal;
}

export default function Bookings() {
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get("highlight");
  const highlightedRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [scheduleDate, setScheduleDate] = useState(getTodayDate());

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [receiptModal, setReceiptModal] = useState(false);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [selectedRejectBooking, setSelectedRejectBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const slots = useMemo(() => generateSlots(), []);

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
    if (!highlightedId || bookings.length === 0) return;

    setTimeout(() => {
      highlightedRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);
  }, [highlightedId, bookings]);

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const data = await getAllBookings();
      setBookings(data || []);

      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (facilityError) throw facilityError;

      setFacilities(facilityData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      setError("");
      setMessage("");
      setProcessingId(id);

      await approveBooking(id);
      await loadBookings(false);

      setMessage("Facility booking request approved successfully.");

      if (detailsModal) {
        setDetailsModal(false);
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to approve booking.");
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
    setSelectedRejectBooking(null);
    setRejectReason("");
    setRejectModal(false);
  }

  async function handleReject() {
    if (!selectedRejectBooking?.id) return;

    try {
      setError("");
      setMessage("");
      setProcessingId(selectedRejectBooking.id);

      await rejectBooking(selectedRejectBooking.id, rejectReason);
      await loadBookings(false);

      setMessage("Facility booking request rejected successfully.");
      closeRejectModal();

      if (detailsModal) {
        setDetailsModal(false);
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reject booking.");
    } finally {
      setProcessingId("");
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

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setFacilityFilter("all");
    setDateFilter("");
  }

  function canReviewBooking(booking) {
    const status = normalizeStatus(booking.status);
    return status === "pending";
  }

  function goToPreviousScheduleDay() {
    setScheduleDate(addDays(scheduleDate, -1));
  }

  function goToNextScheduleDay() {
    setScheduleDate(addDays(scheduleDate, 1));
  }

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => normalizeStatus(b.status) === "pending")
        .length,
      approved: bookings.filter((b) => normalizeStatus(b.status) === "approved")
        .length,
      rejected: bookings.filter((b) => normalizeStatus(b.status) === "rejected")
        .length,
      cancelled: bookings.filter(
        (b) => normalizeStatus(b.status) === "cancelled"
      ).length,
    };
  }, [bookings]);

  const scheduleBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === scheduleDate);
  }, [bookings, scheduleDate]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const facilityName = booking.facilities?.name || "";
      const notes = booking.notes || "";
      const userName = booking.profiles?.full_name || "";

      const searchText = [
        facilityName,
        notes,
        userName,
        status,
        booking.session_type,
        booking.booking_date,
        booking.id,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const matchesFacility =
        facilityFilter === "all" || booking.facility_id === facilityFilter;

      const matchesDate = dateFilter === "" || booking.booking_date === dateFilter;

      return matchesSearch && matchesStatus && matchesFacility && matchesDate;
    });
  }, [bookings, search, statusFilter, facilityFilter, dateFilter]);

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Manage Bookings" />

          <section className="page-hero mb-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-semibold">Booking Approval Center</p>

                <h2 className="mt-2 text-3xl font-black">
                  Review and approve facility requests faster.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  View the facility schedule, inspect booking details, approve
                  requests, reject requests, or print proof of approval.
                </p>
              </div>

              <div className="hidden gap-4 md:flex">
                <div className="rounded-2xl bg-white/15 px-6 py-4">
                  <p className="text-xs font-black uppercase tracking-widest">
                    Pending
                  </p>
                  <h3 className="mt-1 text-3xl font-black">{stats.pending}</h3>
                </div>

                <div className="rounded-2xl bg-white/15 px-6 py-4">
                  <p className="text-xs font-black uppercase tracking-widest">
                    Approved
                  </p>
                  <h3 className="mt-1 text-3xl font-black">{stats.approved}</h3>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard title="Total Requests" value={stats.total} />
            <StatCard title="Pending" value={stats.pending} color="#D9A441" />
            <StatCard title="Approved" value={stats.approved} color="#6BAA75" />
            <StatCard title="Rejected" value={stats.rejected} color="#C65B5B" />
            <StatCard title="Cancelled" value={stats.cancelled} color="#64748B" />
          </section>

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

          <StaffScheduleView
            facilities={facilities}
            slots={slots}
            scheduleDate={scheduleDate}
            scheduleBookings={scheduleBookings}
            processingId={processingId}
            canReviewBooking={canReviewBooking}
            onPreviousDay={goToPreviousScheduleDay}
            onNextDay={goToNextScheduleDay}
            onDateChange={setScheduleDate}
            onView={openDetailsModal}
            onReceipt={openReceiptModal}
            onApprove={handleApprove}
            onReject={openRejectModal}
          />

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by facility, user, notes, status, date, or booking ID"
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

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Facility
                </label>

                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All Facilities</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Date</label>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
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
            <h3 className="text-2xl font-black text-[#2B2B2B]">
              Booking Requests
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review full details before approving or rejecting facility booking
              requests.
            </p>

            {loading ? (
              <p className="mt-6 text-sm text-slate-500">Loading bookings...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                No bookings found for the selected filters.
              </p>
            ) : (
              <div className="booking-card-list mt-6 space-y-4">
                {filteredBookings.map((booking) => {
                  const status = normalizeStatus(booking.status);
                  const canStaffReview = canReviewBooking(booking);
                  const isHighlighted =
                    highlightedId && String(booking.id) === String(highlightedId);

                  return (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      status={status}
                      canStaffReview={canStaffReview}
                      isHighlighted={isHighlighted}
                      highlightedRef={highlightedRef}
                      processingId={processingId}
                      onView={() => openDetailsModal(booking)}
                      onReceipt={() => openReceiptModal(booking)}
                      onApprove={() => handleApprove(booking.id)}
                      onReject={() => openRejectModal(booking)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {detailsModal && selectedBooking && (
            <BookingDetailsModal
              booking={selectedBooking}
              processingId={processingId}
              canStaffReview={canReviewBooking(selectedBooking)}
              onClose={closeDetailsModal}
              onReceipt={() => openReceiptModal(selectedBooking)}
              onApprove={() => handleApprove(selectedBooking.id)}
              onReject={() => openRejectModal(selectedBooking)}
            />
          )}

          {receiptModal && selectedReceiptBooking && (
            <StaffReceiptModal
              booking={selectedReceiptBooking}
              onClose={closeReceiptModal}
            />
          )}

          {rejectModal && selectedRejectBooking && (
            <RejectBookingModal
              booking={selectedRejectBooking}
              reason={rejectReason}
              setReason={setRejectReason}
              processingId={processingId}
              onClose={closeRejectModal}
              onConfirm={handleReject}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function StaffScheduleView({
  facilities,
  slots,
  scheduleDate,
  scheduleBookings,
  processingId,
  canReviewBooking,
  onPreviousDay,
  onNextDay,
  onDateChange,
  onView,
  onReceipt,
  onApprove,
  onReject,
}) {
  function getBookingForCell(facilityId, slot) {
    return scheduleBookings.find((booking) => {
      return (
        String(booking.facility_id) === String(facilityId) &&
        overlaps(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
      );
    });
  }

  return (
    <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#2B2B2B]">
            Staff Schedule View
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            See all court bookings by date. Click a booked slot to view details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPreviousDay}
            className="rounded-xl border border-[#DED8D2] px-4 py-3 font-black text-[#2B2B2B] hover:bg-[#F5F3F1]"
          >
            ‹
          </button>

          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-xl border border-[#DED8D2] px-4 py-3 text-sm font-bold outline-none focus:border-[#C97B6C]"
          />

          <button
            type="button"
            onClick={onNextDay}
            className="rounded-xl border border-[#DED8D2] px-4 py-3 font-black text-[#2B2B2B] hover:bg-[#F5F3F1]"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-xl font-black text-[#2B2B2B]">
          {formatLongDate(scheduleDate)}
        </h4>

        <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          <Legend color="bg-yellow-100 border-yellow-400" label="Pending" />
          <Legend color="bg-green-100 border-green-400" label="Approved" />
          <Legend color="bg-red-100 border-red-400" label="Rejected" />
          <Legend color="bg-slate-100 border-slate-300" label="Cancelled" />
          <Legend color="bg-white border-[#DED8D2]" label="Open" />
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
                    className="min-w-[150px] border border-[#DED8D2] px-4 py-4 text-center"
                  >
                    <p className="font-black text-[#2B2B2B]">
                      {facility.name || `Court ${index + 1}`}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {facility.type || facility.category || "Facility"}
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
                    const booking = getBookingForCell(facility.id, slot);
                    const status = normalizeStatus(booking?.status);

                    return (
                      <td
                        key={`${facility.id}-${slot.start_time}`}
                        className="border border-[#DED8D2] p-0"
                      >
                        {booking ? (
                          <ScheduleBookingCell
                            booking={booking}
                            status={status}
                            processingId={processingId}
                            canReview={canReviewBooking(booking)}
                            onView={() => onView(booking)}
                            onReceipt={() => onReceipt(booking)}
                            onApprove={() => onApprove(booking.id)}
                            onReject={() => onReject(booking)}
                          />
                        ) : (
                          <div className="flex h-[76px] items-center justify-center bg-white px-2 text-xs font-bold text-slate-400">
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
  );
}

function ScheduleBookingCell({
  booking,
  status,
  processingId,
  canReview,
  onView,
  onReceipt,
  onApprove,
  onReject,
}) {
  const canReceipt = status === "approved";

  return (
    <div className={`min-h-[76px] p-2 ${getScheduleCellClass(status)}`}>
      <button type="button" onClick={onView} className="block w-full text-left">
        <p className="truncate text-xs font-black uppercase">{status}</p>

        <p className="mt-1 truncate text-xs font-bold">
          {getRequesterName(booking)}
        </p>

        <p className="mt-1 text-[11px] font-semibold">
          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
        </p>
      </button>

      {canReview && (
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={onApprove}
            disabled={processingId === booking.id}
            className="flex-1 rounded-lg bg-green-600 px-2 py-1 text-[10px] font-black text-white hover:bg-green-700 disabled:opacity-60"
          >
            OK
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={processingId === booking.id}
            className="flex-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black text-white hover:bg-red-700 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}

      {canReceipt && (
        <button
          type="button"
          onClick={onReceipt}
          className="mt-2 w-full rounded-lg bg-[#C97B6C] px-2 py-1 text-[10px] font-black text-white hover:bg-[#B87463]"
        >
          Receipt
        </button>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  status,
  canStaffReview,
  isHighlighted,
  highlightedRef,
  processingId,
  onView,
  onReceipt,
  onApprove,
  onReject,
}) {
  const finalTotal = getFinalTotal(booking);
  const canReceipt = status === "approved";

  return (
    <div
      ref={isHighlighted ? highlightedRef : null}
      className={`rounded-2xl border bg-white p-5 transition ${
        isHighlighted
          ? "border-[#C97B6C] bg-[#FFF6F3] shadow-xl ring-4 ring-[#C97B6C]/25"
          : "border-[#DED8D2]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {isHighlighted && (
              <span className="rounded-full bg-[#C97B6C] px-3 py-1 text-xs font-black uppercase text-white">
                Selected Notification
              </span>
            )}

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                status
              )}`}
            >
              {status}
            </span>
          </div>

          <h4 className="text-lg font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Requested by: <b>{getRequesterName(booking)}</b>
          </p>

          <p className="mt-2 text-sm">
            Session Type:{" "}
            <span className="capitalize">{booking.session_type || "-"}</span>
          </p>

          <p className="text-sm">Notes: {booking.notes || "-"}</p>

          {status === "rejected" && booking.rejection_reason && (
            <p className="mt-2 text-sm text-red-600">
              Rejection reason: {booking.rejection_reason}
            </p>
          )}

          {status === "cancelled" && booking.cancellation_reason && (
            <p className="mt-2 text-sm text-slate-500">
              Cancellation reason: {booking.cancellation_reason}
            </p>
          )}

          <p className="mt-3 text-sm font-black">Total: {money(finalTotal)}</p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <button
            type="button"
            onClick={onView}
            className="rounded-xl border border-[#DED8D2] px-5 py-3 font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
          >
            View Details
          </button>

          {canReceipt && (
            <button
              type="button"
              onClick={onReceipt}
              className="rounded-xl bg-[#C97B6C] px-5 py-3 font-bold text-white hover:bg-[#B87463]"
            >
              View Receipt
            </button>
          )}

          {canStaffReview ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onApprove}
                disabled={processingId === booking.id}
                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {processingId === booking.id ? "Approving..." : "Approve"}
              </button>

              <button
                type="button"
                onClick={onReject}
                disabled={processingId === booking.id}
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="max-w-[260px] rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
              {status === "cancelled"
                ? "Cancelled by user"
                : status === "approved"
                ? "Booking already approved."
                : status === "rejected"
                ? "Booking rejected."
                : "No staff action needed."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({
  booking,
  processingId,
  canStaffReview,
  onClose,
  onReceipt,
  onApprove,
  onReject,
}) {
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
              {getFacilityName(booking)}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the full request before taking action.
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

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Status" value={status} capitalize />
          <DetailItem label="Requested By" value={getRequesterName(booking)} />
          <DetailItem label="Facility" value={getFacilityName(booking)} />
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

        {status === "rejected" && booking.rejection_reason && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">Rejection Reason</p>
            <p className="mt-2 text-sm text-red-600">
              {booking.rejection_reason}
            </p>
          </div>
        )}

        {status === "cancelled" && booking.cancellation_reason && (
          <div className="mt-5 rounded-2xl bg-slate-100 p-4">
            <p className="text-sm font-black text-slate-700">
              Cancellation Reason
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {booking.cancellation_reason}
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

          {canStaffReview ? (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={processingId === booking.id}
                className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject Booking
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={processingId === booking.id}
                className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {processingId === booking.id ? "Approving..." : "Approve Booking"}
              </button>
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
              This booking has already been reviewed or cancelled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffReceiptModal({ booking, onClose }) {
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
              Staff Receipt
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Proof of Booking Approval
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Print this receipt or save it as PDF for staff records.
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

        <div className="rounded-[24px] border border-[#DED8D2] bg-white p-6 print:border-0 print:p-0">
          <div className="border-b border-[#DED8D2] pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#2B2B2B]">
                  InCredoBall Sports
                </h1>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Staff Booking Approval Receipt
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
            <ReceiptItem label="Requested By" value={getRequesterName(booking)} />
            <ReceiptItem label="Facility" value={getFacilityName(booking)} />
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
            <ReceiptItem label="Total Amount" value={money(finalTotal)} />
          </div>

          <div className="mt-6 rounded-2xl bg-[#F5F3F1] p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-lg font-black text-[#2B2B2B]">
                Final Total
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
              This staff receipt confirms that the facility booking has been
              approved in the InCredoBall Sports Management System. This may be
              used for verification, walk-in confirmation, and booking records.
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

function RejectBookingModal({
  booking,
  reason,
  setReason,
  processingId,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-[#2B2B2B]">
          Reject Booking Request
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Add a reason so the user can understand why the request was rejected.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">
            {getFacilityName(booking)}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Example: Time slot is unavailable due to maintenance."
          className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processingId === booking.id}
            className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={processingId === booking.id}
            className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {processingId === booking.id ? "Rejecting..." : "Confirm Reject"}
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

function StatCard({ title, value, color = "#2B2B2B" }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>

      <h3 className="mt-3 text-3xl font-black" style={{ color }}>
        {value}
      </h3>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${color}`} />
      {label}
    </span>
  );
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

function getScheduleCellClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return "bg-green-100 text-green-800";
  }

  if (value === "rejected") {
    return "bg-red-100 text-red-800";
  }

  if (value === "cancelled") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-yellow-100 text-yellow-800";
}