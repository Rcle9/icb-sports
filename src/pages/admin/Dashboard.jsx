import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

const FACILITY_COLORS = [
  "#C97B6C",
  "#16a34a",
  "#dc2626",
  "#f97316",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(dateString) {
  if (!dateString) return "-";

  try {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
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

function getFacilityName(booking) {
  return booking?.facilities?.name || "Unknown Facility";
}

function getUserName(booking) {
  return booking?.profiles?.full_name || "Unknown User";
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`admin-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_requests" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => loadDashboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [bookingsRes, maintenanceRes, usersRes, facilitiesRes, inventoryRes] =
        await Promise.all([
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

          supabase
            .from("maintenance_requests")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase.from("profiles").select("*"),

          supabase.from("facilities").select("*"),

          supabase.from("inventory").select("*"),
        ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (usersRes.error) throw usersRes.error;
      if (facilitiesRes.error) throw facilitiesRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      setBookings(bookingsRes.data || []);
      setMaintenance(maintenanceRes.data || []);
      setUsers(usersRes.data || []);
      setFacilities(facilitiesRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      console.error("Admin dashboard error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  const facilityNames = useMemo(() => {
    const names = bookings.map(
      (booking) => booking.facilities?.name || "Unknown Facility"
    );

    return [...new Set(names)];
  }, [bookings]);

  const bookingTrendByFacility = useMemo(() => {
    const grouped = {};

    bookings.forEach((booking) => {
      const dateKey = booking.booking_date || "Unknown";
      const dateLabel = formatDateLabel(dateKey);
      const facilityName = booking.facilities?.name || "Unknown Facility";

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateLabel,
          rawDate: dateKey,
        };

        facilityNames.forEach((name) => {
          grouped[dateKey][name] = 0;
        });
      }

      grouped[dateKey][facilityName] =
        Number(grouped[dateKey][facilityName] || 0) + 1;
    });

    return Object.values(grouped)
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
      .slice(-7);
  }, [bookings, facilityNames]);

  const facilityUsage = useMemo(() => {
    const grouped = {};

    bookings.forEach((booking) => {
      const facilityName = booking.facilities?.name || "Unknown Facility";

      grouped[facilityName] = (grouped[facilityName] || 0) + 1;
    });

    return Object.entries(grouped).map(([name, count]) => ({
      name,
      bookings: count,
    }));
  }, [bookings]);

  const bookingStatus = useMemo(() => {
    const approved = bookings.filter(
      (b) => normalizeStatus(b.status) === "approved"
    ).length;
    const pending = bookings.filter(
      (b) => normalizeStatus(b.status) === "pending"
    ).length;
    const rejected = bookings.filter(
      (b) => normalizeStatus(b.status) === "rejected"
    ).length;
    const cancelled = bookings.filter(
      (b) => normalizeStatus(b.status) === "cancelled"
    ).length;

    return [
      { name: "Approved", value: approved, color: "#16a34a" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Rejected", value: rejected, color: "#dc2626" },
      { name: "Cancelled", value: cancelled, color: "#64748b" },
    ];
  }, [bookings]);

  const maintenancePriority = useMemo(() => {
    const critical = maintenance.filter((m) => m.priority === "critical").length;
    const high = maintenance.filter((m) => m.priority === "high").length;
    const medium = maintenance.filter((m) => m.priority === "medium").length;
    const low = maintenance.filter((m) => m.priority === "low").length;

    return [
      { name: "Critical", value: critical, color: "#C97B6C" },
      { name: "High", value: high, color: "#dc2626" },
      { name: "Medium", value: medium, color: "#f59e0b" },
      { name: "Low", value: low, color: "#16a34a" },
    ];
  }, [maintenance]);

  const stats = useMemo(() => {
    const today = getTodayDate();

    const normalizedUsers = users.map((user) => ({
      ...user,
      role: String(user.role || "user").toLowerCase(),
    }));

    const approvedBookings = bookings.filter(
      (b) => normalizeStatus(b.status) === "approved"
    );

    const pendingBookings = bookings.filter(
      (b) => normalizeStatus(b.status) === "pending"
    );

    const todaysBookings = bookings.filter((b) => b.booking_date === today);

    const approvedRevenue = approvedBookings.reduce((sum, booking) => {
      return sum + Number(booking.total_amount || 0);
    }, 0);

    const openMaintenance = maintenance.filter((m) =>
      ["pending", "open", "in_progress"].includes(normalizeStatus(m.status))
    );

    const lowStockItems = inventory.filter((item) => {
      const quantity = Number(item.quantity || 0);
      const threshold = Number(item.min_threshold || 0);

      return threshold > 0 && quantity <= threshold;
    });

    return {
      users: normalizedUsers.length,
      staff: normalizedUsers.filter((u) => u.role === "staff").length,
      admins: normalizedUsers.filter((u) => u.role === "admin").length,
      facilities: facilities.length,
      bookings: bookings.length,
      approved: approvedBookings.length,
      pending: pendingBookings.length,
      todaysBookings: todaysBookings.length,
      approvedRevenue,
      openMaintenance: openMaintenance.length,
      lowStock: lowStockItems.length,
    };
  }, [users, bookings, maintenance, facilities, inventory]);

  const todaysBookings = useMemo(() => {
    const today = getTodayDate();

    return bookings
      .filter((booking) => booking.booking_date === today)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
      .slice(0, 5);
  }, [bookings]);

  const recentBookingActivity = useMemo(() => {
    return bookings.slice(0, 6);
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

  const pendingMaintenance = useMemo(() => {
    return maintenance
      .filter((item) =>
        ["pending", "open", "in_progress"].includes(normalizeStatus(item.status))
      )
      .slice(0, 5);
  }, [maintenance]);

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Admin Dashboard" />

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Admin Control Center</p>

                <h2 className="mt-2 text-3xl font-black">
                  Monitor bookings, revenue, inventory, and maintenance.
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-blue-50">
                  See today’s booking activity, pending requests, facility trends,
                  and operational alerts from one dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <QuickButton to="/admin/reports" label="Reports" />
                <QuickButton to="/admin/bookings" label="Bookings" />
                <QuickButton to="/admin/inventory" label="Inventory" />
                <QuickButton to="/admin/maintenance" label="Maintenance" />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Today's Bookings"
              value={loading ? "..." : stats.todaysBookings}
              sub="Bookings scheduled today"
            />

            <StatCard
              title="Pending Requests"
              value={loading ? "..." : stats.pending}
              sub="Waiting for staff approval"
              accent="#D9A441"
            />

            <StatCard
              title="Approved Revenue"
              value={loading ? "..." : money(stats.approvedRevenue)}
              sub={`${stats.approved} approved bookings`}
              accent="#C97B6C"
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
              title="Users"
              value={loading ? "..." : stats.users}
              sub={`Staff: ${stats.staff} • Admins: ${stats.admins}`}
            />

            <StatCard
              title="Facilities"
              value={loading ? "..." : stats.facilities}
              sub="Managed sports facilities"
            />

            <StatCard
              title="Facility Bookings"
              value={loading ? "..." : stats.bookings}
              sub={`Approved: ${stats.approved} • Pending: ${stats.pending}`}
            />

            <StatCard
              title="Open Maintenance"
              value={loading ? "..." : stats.openMaintenance}
              sub="Active repair requests"
              accent="#f97316"
            />
          </section>

          {loading ? (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
              Loading dashboard...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <DashboardListCard
                  title="Today's Bookings"
                  description="Scheduled reservations for today."
                  emptyText="No bookings scheduled today."
                >
                  {todaysBookings.map((booking) => (
                    <BookingActivityItem key={booking.id} booking={booking} />
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
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {item.name || "Inventory Item"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Category: {item.category || "-"}
                      </p>

                      <p className="mt-2 text-sm font-bold text-[#C65B5B]">
                        Qty: {item.quantity || 0} • Min: {item.min_threshold || 0}
                      </p>
                    </div>
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Pending Maintenance"
                  description="Open requests that need attention."
                  emptyText="No pending maintenance."
                >
                  {pendingMaintenance.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {item.item_name || "Maintenance Request"}
                      </p>

                      <p className="mt-1 text-sm capitalize text-slate-500">
                        {String(item.request_type || "-").replaceAll("_", " ")}
                      </p>

                      <p className="mt-2 text-sm font-bold capitalize text-[#f97316]">
                        {String(item.status || "pending").replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </DashboardListCard>
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-950">
                    Booking Trend by Facility
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Each color represents a different facility.
                  </p>

                  <div className="mt-6 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookingTrendByFacility}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />

                        {facilityNames.map((facilityName, index) => (
                          <Line
                            key={facilityName}
                            type="monotone"
                            dataKey={facilityName}
                            name={facilityName}
                            stroke={FACILITY_COLORS[index % FACILITY_COLORS.length]}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 7 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-950">
                    Booking Status
                  </h3>

                  <div className="mt-6 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingStatus}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={120}
                          label
                        >
                          {bookingStatus.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>

                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-950">
                    Facility Usage
                  </h3>

                  <div className="mt-6 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={facilityUsage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="bookings" name="Bookings" fill="#C97B6C" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-950">
                    Maintenance Priority
                  </h3>

                  <div className="mt-6 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={maintenancePriority}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={120}
                          label
                        >
                          {maintenancePriority.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>

                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-[28px] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">
                      Recent Booking Activity
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest facility booking records.
                    </p>
                  </div>

                  <Link
                    to="/admin/reports"
                    className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                  >
                    View Full Reports
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {recentBookingActivity.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No booking activity yet.
                    </p>
                  ) : (
                    recentBookingActivity.map((booking) => (
                      <BookingActivityItem key={booking.id} booking={booking} />
                    ))
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
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black" style={{ color: accent }}>
        {value}
      </h3>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function DashboardListCard({ title, description, emptyText, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 space-y-3">
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

function BookingActivityItem({ booking }) {
  const status = normalizeStatus(booking.status);

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{getFacilityName(booking)}</p>

          <p className="mt-1 text-sm text-slate-500">
            {getUserName(booking)}
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

      <p className="mt-3 text-sm text-slate-600">
        {formatFullDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
        {formatTime(booking.end_time)}
      </p>

      <p className="mt-2 text-sm font-black text-[#C97B6C]">
        {money(booking.total_amount || 0)}
      </p>
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