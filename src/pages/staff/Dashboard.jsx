import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
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

function formatTime(time24) {
  if (!time24) return "-";

  const [hourStr, minute] = String(time24).slice(0, 5).split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getRequesterName(booking) {
  return booking?.profiles?.full_name || "Unknown User";
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

export default function StaffDashboard() {
  const channelRef = useRef(null);
  const intervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function startRealtimeDashboard() {
      await loadDashboardData(mounted);

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`staff-dashboard-realtime-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          () => loadDashboardData(mounted, false)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory" },
          () => loadDashboardData(mounted, false)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "maintenance_requests" },
          () => loadDashboardData(mounted, false)
        )
        .subscribe();

      channelRef.current = channel;

      intervalRef.current = setInterval(() => {
        loadDashboardData(mounted, false);
      }, 6000);
    }

    startRealtimeDashboard();

    return () => {
      mounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  async function loadDashboardData(mounted = true, showLoading = true) {
    try {
      if (mounted && showLoading) setLoading(true);
      if (mounted) setError("");

      const [bookingsRes, inventoryRes, maintenanceRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `
            *,
            facilities (*),
            profiles:user_id (
              id,
              full_name,
              role
            )
          `
          )
          .order("created_at", { ascending: false }),

        supabase.from("inventory").select("*").order("name", { ascending: true }),

        supabase
          .from("maintenance_requests")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;

      if (!mounted) return;

      setBookings(bookingsRes.data || []);
      setInventory(inventoryRes.data || []);
      setMaintenance(maintenanceRes.data || []);
    } catch (err) {
      console.error("Staff dashboard update error:", err.message);

      if (mounted) {
        setError(err.message || "Failed to load staff dashboard.");
      }
    } finally {
      if (mounted) setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const today = getTodayDate();

    const todayBookings = bookings.filter(
      (booking) => booking.booking_date === today
    );

    const pendingBookings = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "pending"
    );

    const approvedToday = todayBookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    );

    const rejectedOrCancelled = bookings.filter((booking) =>
      ["rejected", "cancelled"].includes(normalizeStatus(booking.status))
    );

    const openMaintenance = maintenance.filter((item) =>
      ["pending", "open", "in_progress"].includes(normalizeStatus(item.status))
    );

    const lowStock = inventory.filter((item) => {
      const quantity = Number(item.quantity || 0);
      const threshold = Number(item.min_threshold || 0);

      return threshold > 0 && quantity <= threshold;
    });

    const todayRevenue = approvedToday.reduce((sum, booking) => {
      return sum + Number(booking.total_amount || 0);
    }, 0);

    return {
      todayBookings: todayBookings.length,
      pendingBookings: pendingBookings.length,
      approvedToday: approvedToday.length,
      rejectedOrCancelled: rejectedOrCancelled.length,
      openMaintenance: openMaintenance.length,
      inventoryItems: inventory.length,
      lowStock: lowStock.length,
      totalPending: pendingBookings.length + openMaintenance.length,
      todayRevenue,
    };
  }, [bookings, inventory, maintenance]);

  const todaysBookings = useMemo(() => {
    const today = getTodayDate();

    return bookings
      .filter((booking) => booking.booking_date === today)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
      .slice(0, 5);
  }, [bookings]);

  const recentPendingBookings = useMemo(() => {
    return bookings
      .filter((booking) => normalizeStatus(booking.status) === "pending")
      .slice(0, 6);
  }, [bookings]);

  const busyFacilities = useMemo(() => {
    const today = getTodayDate();
    const grouped = {};

    bookings
      .filter((booking) => booking.booking_date === today)
      .forEach((booking) => {
        const facility = getFacilityName(booking);
        grouped[facility] = (grouped[facility] || 0) + 1;
      });

    return Object.entries(grouped)
      .map(([facility, count]) => ({ facility, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [bookings]);

  const lowStockItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const quantity = Number(item.quantity || 0);
        const threshold = Number(item.min_threshold || 0);

        return threshold > 0 && quantity <= threshold;
      })
      .slice(0, 5);
  }, [inventory]);

  const maintenanceAlerts = useMemo(() => {
    return maintenance
      .filter((item) =>
        ["pending", "open", "in_progress"].includes(normalizeStatus(item.status))
      )
      .slice(0, 5);
  }, [maintenance]);

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Dashboard" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Operations Control Center
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Review facility requests and keep daily operations moving.
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-blue-50">
                  Monitor approvals, today’s schedule, maintenance alerts, low
                  stock items, and recent facility requests.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <QuickButton to="/staff/bookings" label="Manage Bookings" />
                <QuickButton to="/staff/inventory" label="Inventory" />
                <QuickButton to="/staff/maintenance" label="Maintenance" />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Today’s Bookings"
              value={loading ? "..." : stats.todayBookings}
              sub="Scheduled for today"
            />

            <StatCard
              title="Pending Approvals"
              value={loading ? "..." : stats.pendingBookings}
              sub="Needs staff review"
              accent="#D9A441"
            />

            <StatCard
              title="Approved Today"
              value={loading ? "..." : stats.approvedToday}
              sub={`Revenue: ${money(stats.todayRevenue)}`}
              accent="#6BAA75"
            />

            <StatCard
              title="Low Stock Alerts"
              value={loading ? "..." : stats.lowStock}
              sub="Inventory needs checking"
              accent="#C65B5B"
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Inventory Items"
              value={loading ? "..." : stats.inventoryItems}
              sub="Total tracked items"
            />

            <StatCard
              title="Maintenance"
              value={loading ? "..." : stats.openMaintenance}
              sub="Open repair requests"
              accent="#f97316"
            />

            <StatCard
              title="Rejected / Cancelled"
              value={loading ? "..." : stats.rejectedOrCancelled}
              sub="Reviewed but not approved"
              accent="#64748B"
            />

            <StatCard
              title="Total Pending"
              value={loading ? "..." : stats.totalPending}
              sub="Bookings + maintenance"
              accent="#C97B6C"
            />
          </section>

          {loading ? (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
              Loading dashboard...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <DashboardListCard
                  title="Today’s Schedule"
                  description="Bookings scheduled for today."
                  emptyText="No bookings scheduled today."
                >
                  {todaysBookings.map((booking) => (
                    <BookingItem key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Busy Facilities Today"
                  description="Facilities with the most bookings today."
                  emptyText="No busy facility alerts today."
                >
                  {busyFacilities.map((item) => (
                    <div
                      key={item.facility}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {item.facility}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.count} booking(s) today
                      </p>

                      <p className="mt-2 text-xs font-black uppercase text-[#C97B6C]">
                        Busy Schedule
                      </p>
                    </div>
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Low Stock Inventory"
                  description="Items that reached minimum threshold."
                  emptyText="No low stock items."
                >
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {item.name || "Inventory Item"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Category: {item.category || "-"}
                      </p>

                      <p className="mt-2 text-sm font-bold text-[#C65B5B]">
                        Qty: {item.quantity || 0} • Min:{" "}
                        {item.min_threshold || 0}
                      </p>
                    </div>
                  ))}
                </DashboardListCard>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-black">
                        Recent Facility Booking Requests
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Pending requests that need staff approval.
                      </p>
                    </div>

                    <Link
                      to="/staff/bookings"
                      className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                    >
                      Review All
                    </Link>
                  </div>

                  {recentPendingBookings.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No pending facility bookings.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {recentPendingBookings.map((booking) => (
                        <BookingItem key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-black">
                        Maintenance Alerts
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Active maintenance tasks that need attention.
                      </p>
                    </div>

                    <Link
                      to="/staff/maintenance"
                      className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                    >
                      View Maintenance
                    </Link>
                  </div>

                  {maintenanceAlerts.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No issues found.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {maintenanceAlerts.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-slate-950">
                                {item.title ||
                                  item.issue ||
                                  item.item_name ||
                                  item.request_type ||
                                  "Maintenance Request"}
                              </h4>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.description ||
                                  item.details ||
                                  "No description"}
                              </p>
                            </div>

                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-600">
                              {String(item.status || "pending").replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </div>

                          {item.priority && (
                            <p className="mt-2 text-xs font-bold uppercase text-[#C97B6C]">
                              Priority: {item.priority}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickButton({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/25"
    >
      {label}
    </Link>
  );
}

function StatCard({ title, value, sub, accent = "#0f172a" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <h3 className="mt-2 text-2xl font-black" style={{ color: accent }}>
        {value}
      </h3>

      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function DashboardListCard({ title, description, emptyText, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-[24px] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-4 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function BookingItem({ booking }) {
  const status = normalizeStatus(booking.status);

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-950">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Requested by: {getRequesterName(booking)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
        {formatTime(booking.end_time)}
      </p>

      <p className="mt-2 text-sm font-black text-[#C97B6C]">
        {money(booking.total_amount || 0)}
      </p>
    </div>
  );
}