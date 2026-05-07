import { useEffect, useMemo, useState } from "react";
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
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`staff-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings();
        }
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
      await approveBooking(id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to approve booking.");
    }
  }

  async function handleReject(id) {
    try {
      setError("");
      await rejectBooking(id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to reject booking.");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setFacilityFilter("all");
    setDateFilter("");
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

      const matchesSearch =
        search.trim() === "" ||
        facilityName.toLowerCase().includes(search.toLowerCase()) ||
        notes.toLowerCase().includes(search.toLowerCase()) ||
        status.toLowerCase().includes(search.toLowerCase());

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
                  Filter by facility, date, or request status and handle member
                  requests from one clean workspace.
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
                  placeholder="Search by facility, notes, or status"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
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
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
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
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold"
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

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-[#DED8D2] bg-white p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
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

                          <p className="text-sm">
                            Notes: {booking.notes || "-"}
                          </p>

                          {booking.includes_coach && (
                            <p className="mt-2 text-sm font-semibold text-[#C97B6C]">
                              Includes Coach • Coach Rate:{" "}
                              {money(booking.coach_rate_per_hour)} / hour
                            </p>
                          )}

                          <p className="mt-1 text-sm font-black">
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
                          <span
                            className={`rounded-full px-4 py-2 text-xs font-black uppercase ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                          {status === "pending" ? (
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleApprove(booking.id)}
                                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(booking.id)}
                                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-500">
                              {status === "cancelled"
                                ? "Cancelled by user"
                                : "Reviewed"}
                            </p>
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
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-slate-200 text-slate-700";
  return "bg-yellow-100 text-yellow-700";
}