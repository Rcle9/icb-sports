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

function formatTime(time) {
  if (!time) return "-";
  return String(time).slice(0, 5);
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

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

  async function handleApprove(id) {
    try {
      setError("");
      setMessage("");
      setProcessingId(id);

      await approveBooking(id);
      await loadBookings(false);

      setMessage("Facility booking request approved successfully.");
    } catch (err) {
      setError(err.message || "Failed to approve booking.");
    } finally {
      setProcessingId("");
    }
  }

  async function handleReject(id) {
    try {
      setError("");
      setMessage("");
      setProcessingId(id);

      await rejectBooking(id);
      await loadBookings(false);

      setMessage("Facility booking request rejected successfully.");
    } catch (err) {
      setError(err.message || "Failed to reject booking.");
    } finally {
      setProcessingId("");
    }
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

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const facilityName = booking.facilities?.name || "";
      const notes = booking.notes || "";

      const searchText = [
        facilityName,
        notes,
        status,
        booking.session_type,
        booking.booking_date,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const matchesFacility =
        facilityFilter === "all" || booking.facility_id === facilityFilter;

      const matchesDate =
        dateFilter === "" || booking.booking_date === dateFilter;

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
                  Staff can review, approve, or reject facility booking requests
                  submitted by users.
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
            <StatCard
              title="Cancelled"
              value={stats.cancelled}
              color="#64748B"
            />
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by facility, notes, status, or date"
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
              Review, approve, or reject facility booking requests.
            </p>

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

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
                    <div
                      key={booking.id}
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
                            {booking.facilities?.name || "Facility Booking"}
                          </h4>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {booking.booking_date} •{" "}
                            {formatTime(booking.start_time)} -{" "}
                            {formatTime(booking.end_time)}
                          </p>

                          <p className="mt-2 text-sm">
                            Session Type:{" "}
                            <span className="capitalize">
                              {booking.session_type || "-"}
                            </span>
                          </p>

                          <p className="text-sm">Notes: {booking.notes || "-"}</p>

                          <p className="mt-3 text-sm font-black">
                            Total: {money(booking.total_amount)}
                          </p>

                          {status === "cancelled" &&
                            booking.cancellation_reason && (
                              <p className="mt-2 text-sm text-slate-500">
                                Cancellation reason:{" "}
                                {booking.cancellation_reason}
                              </p>
                            )}
                        </div>

                        <div className="flex flex-col items-start gap-3 md:items-end">
                          {canStaffReview ? (
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleApprove(booking.id)}
                                disabled={processingId === booking.id}
                                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                              >
                                {processingId === booking.id
                                  ? "Approving..."
                                  : "Approve"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(booking.id)}
                                disabled={processingId === booking.id}
                                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {processingId === booking.id
                                  ? "Rejecting..."
                                  : "Reject"}
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
                })}
              </div>
            )}
          </section>
        </div>
      </main>
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

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}