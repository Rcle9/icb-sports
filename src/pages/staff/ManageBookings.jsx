import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  approveBooking,
  getAllBookings,
  rejectBooking,
} from "../../services/bookingService";

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export default function ManageBookings() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("manage-bookings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");
      const data = await getAllBookings();
      setBookings(data || []);
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(bookingId) {
    try {
      setActionLoadingId(bookingId);
      setError("");
      await approveBooking(bookingId, user?.id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to approve booking.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(bookingId) {
    try {
      setActionLoadingId(bookingId);
      setError("");
      await rejectBooking(bookingId, user?.id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to reject booking.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const summary = useMemo(() => {
    const pending = bookings.filter((item) => item.status === "pending").length;
    const approved = bookings.filter((item) => item.status === "approved").length;
    const rejected = bookings.filter((item) => item.status === "rejected").length;
    const total = bookings.length;
    return { total, pending, approved, rejected };
  }, [bookings]);

  const facilityOptions = useMemo(() => {
    const uniqueFacilities = Array.from(
      new Set(bookings.map((item) => item.facilities?.name).filter(Boolean))
    );
    return uniqueFacilities.sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingFacility = booking.facilities?.name || "";
      const bookingDate = booking.booking_date || "";
      const bookingStatus = booking.status || "";
      const searchSource =
        `${bookingFacility} ${bookingDate} ${bookingStatus} ${booking.notes || ""}`.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ? true : bookingStatus === statusFilter;

      const matchesFacility =
        facilityFilter === "all" ? true : bookingFacility === facilityFilter;

      const matchesDate = dateFilter ? bookingDate === dateFilter : true;

      const matchesSearch = searchTerm
        ? searchSource.includes(searchTerm.toLowerCase())
        : true;

      return matchesStatus && matchesFacility && matchesDate && matchesSearch;
    });
  }, [bookings, statusFilter, facilityFilter, dateFilter, searchTerm]);

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Manage Bookings" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-blue-800 to-blue-600 p-6 text-white md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Booking Approval Center
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Review and approve facility requests faster.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Filter by facility, date, or request status and handle member
                  requests from one clean workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:w-[360px]">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-bold">{summary.pending}</p>
                  <p className="text-xs text-blue-100">Needs review</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Approved
                  </p>
                  <p className="mt-2 text-2xl font-bold">{summary.approved}</p>
                  <p className="text-xs text-blue-100">Confirmed requests</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-black">Total Requests</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.total}
              </h2>
              <p className="mt-2 text-xs text-slate-700">All facility booking entries</p>
            </Card>

            <Card>
              <p className="text-sm text-black">Pending</p>
              <h2 className="mt-2 text-3xl font-bold text-orange-500">
                {loading ? "..." : summary.pending}
              </h2>
              <p className="mt-2 text-xs text-slate-700">Waiting for approval</p>
            </Card>

            <Card>
              <p className="text-sm text-black">Approved</p>
              <h2 className="mt-2 text-3xl font-bold text-green-600">
                {loading ? "..." : summary.approved}
              </h2>
              <p className="mt-2 text-xs text-slate-700">Confirmed reservations</p>
            </Card>

            <Card>
              <p className="text-sm text-black">Rejected</p>
              <h2 className="mt-2 text-3xl font-bold text-red-600">
                {loading ? "..." : summary.rejected}
              </h2>
              <p className="mt-2 text-xs text-slate-700">Declined requests</p>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-black">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by facility, notes, or status"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="w-full lg:w-52">
                <label className="mb-2 block text-sm font-medium text-black">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="w-full lg:w-60">
                <label className="mb-2 block text-sm font-medium text-black">
                  Facility
                </label>
                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="all">All Facilities</option>
                  {facilityOptions.map((facility) => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full lg:w-52">
                <label className="mb-2 block text-sm font-medium text-black">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setFacilityFilter("all");
                  setDateFilter("");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-black transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </Card>

          <Card className="flex min-h-[500px] flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black">Booking Requests</h2>
              <p className="mt-1 text-sm text-black">
                Review, approve, or reject facility booking requests.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="text-black">Loading bookings...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-black">No bookings found for the selected filters.</p>
            ) : (
              <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="safe-text text-lg font-semibold">
                          {booking.facilities?.name || "Unknown Facility"}
                        </p>
                        <p className="safe-text mt-1 text-sm">
                          {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                          {formatTime(booking.end_time)}
                        </p>
                        <p className="safe-text mt-2 text-sm capitalize">
                          Session type: {booking.session_type || "facility"}
                        </p>
                        <p className="safe-text mt-1 text-sm">
                          Notes: {booking.notes || "-"}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            booking.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {booking.status}
                        </span>

                        {booking.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(booking.id)}
                              disabled={actionLoadingId === booking.id}
                              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                              {actionLoadingId === booking.id ? "..." : "Approve"}
                            </button>

                            <button
                              onClick={() => handleReject(booking.id)}
                              disabled={actionLoadingId === booking.id}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              {actionLoadingId === booking.id ? "..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-700">Reviewed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}