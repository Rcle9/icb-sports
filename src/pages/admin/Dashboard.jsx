import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatDateLabel(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    staff: 0,
    admins: 0,
    facilities: 0,
    bookings: 0,
    approvedBookings: 0,
    pendingBookings: 0,
    rejectedBookings: 0,
    coachBookings: 0,
    pendingCoachBookings: 0,
    inventoryItems: 0,
    lowStockItems: 0,
    maintenanceOpen: 0,
  });

  const [bookingTrend, setBookingTrend] = useState([]);
  const [facilityUsage, setFacilityUsage] = useState([]);
  const [bookingStatusData, setBookingStatusData] = useState([]);
  const [maintenancePriorityData, setMaintenancePriorityData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel("admin-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_requests" },
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

      const [
        profilesRes,
        facilitiesRes,
        bookingsRes,
        coachBookingsRes,
        inventoryRes,
        maintenanceRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("facilities").select("*"),
        supabase.from("bookings").select(`
          *,
          facilities (
            id,
            name,
            type
          )
        `),
        supabase.from("coach_bookings").select("*"),
        supabase.from("inventory").select("*"),
        supabase.from("maintenance_requests").select("*"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (facilitiesRes.error) throw facilitiesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (coachBookingsRes.error) throw coachBookingsRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;

      const profiles = profilesRes.data || [];
      const facilities = facilitiesRes.data || [];
      const bookings = bookingsRes.data || [];
      const coachBookings = coachBookingsRes.data || [];
      const inventory = inventoryRes.data || [];
      const maintenance = maintenanceRes.data || [];

      const users = profiles.filter((p) => p.role === "user").length;
      const staff = profiles.filter((p) => p.role === "staff").length;
      const admins = profiles.filter((p) => p.role === "admin").length;

      const approvedBookings = bookings.filter((b) => b.status === "approved").length;
      const pendingBookings = bookings.filter((b) => b.status === "pending").length;
      const rejectedBookings = bookings.filter((b) => b.status === "rejected").length;
      const pendingCoachBookings = coachBookings.filter((b) => b.status === "pending").length;

      const lowStockItems = inventory.filter(
        (item) => item.status === "low_stock" || item.status === "out_of_stock"
      ).length;

      const maintenanceOpen = maintenance.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "in_progress" ||
          item.status === "replacement_requested"
      ).length;

      setStats({
        users,
        staff,
        admins,
        facilities: facilities.length,
        bookings: bookings.length,
        approvedBookings,
        pendingBookings,
        rejectedBookings,
        coachBookings: coachBookings.length,
        pendingCoachBookings,
        inventoryItems: inventory.length,
        lowStockItems,
        maintenanceOpen,
      });

      buildBookingTrend(bookings);
      buildFacilityUsage(bookings);
      buildBookingStatusData(bookings);
      buildMaintenancePriorityData(maintenance);
      buildRecentLogs(bookings, coachBookings, maintenance, inventory);
    } catch (error) {
      console.error("Failed to load admin dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function buildBookingTrend(bookings) {
    const grouped = {};

    bookings.forEach((booking) => {
      const dateKey = booking.booking_date || booking.created_at?.split("T")[0];
      if (!dateKey) return;
      grouped[dateKey] = (grouped[dateKey] || 0) + 1;
    });

    const trend = Object.keys(grouped)
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(-7)
      .map((date) => ({
        date: formatDateLabel(date),
        bookings: grouped[date],
      }));

    setBookingTrend(trend);
  }

  function buildFacilityUsage(bookings) {
    const grouped = {};

    bookings.forEach((booking) => {
      const facilityName = booking.facilities?.name || "Unknown";
      grouped[facilityName] = (grouped[facilityName] || 0) + 1;
    });

    const usage = Object.keys(grouped).map((name) => ({
      name,
      bookings: grouped[name],
    }));

    setFacilityUsage(usage);
  }

  function buildBookingStatusData(bookings) {
    const approved = bookings.filter((b) => b.status === "approved").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;

    setBookingStatusData([
      { name: "Approved", value: approved },
      { name: "Pending", value: pending },
      { name: "Rejected", value: rejected },
    ]);
  }

  function buildMaintenancePriorityData(maintenance) {
    const grouped = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    maintenance.forEach((item) => {
      if (grouped[item.priority] !== undefined) {
        grouped[item.priority] += 1;
      }
    });

    setMaintenancePriorityData([
      { name: "Low", value: grouped.low },
      { name: "Medium", value: grouped.medium },
      { name: "High", value: grouped.high },
      { name: "Critical", value: grouped.critical },
    ]);
  }

  function buildRecentLogs(bookings, coachBookings, maintenance, inventory) {
    const logs = [
      ...bookings.slice(-4).map((item) => ({
        type: "Facility Booking",
        text: `Booking ${item.status} on ${item.booking_date}`,
        date: item.created_at,
      })),
      ...coachBookings.slice(-3).map((item) => ({
        type: "Coaching",
        text: `Coaching request ${item.status}`,
        date: item.created_at,
      })),
      ...maintenance.slice(-3).map((item) => ({
        type: "Maintenance",
        text: `${item.item_name} is ${item.status.replaceAll("_", " ")}`,
        date: item.created_at,
      })),
      ...inventory.slice(-2).map((item) => ({
        type: "Inventory",
        text: `${item.name} stock status is ${item.status.replaceAll("_", " ")}`,
        date: item.created_at,
      })),
    ]
      .filter((log) => log.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    setRecentLogs(logs);
  }

  const pieColors = useMemo(
    () => ["#16a34a", "#f59e0b", "#dc2626", "#2563eb"],
    []
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="Admin Dashboard" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Executive System Overview
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Monitor the entire InCredoBall ecosystem.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Analyze activity, manage users and facilities, and keep the
                  sports center running with data-backed decisions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:w-[360px]">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Users
                  </p>
                  <p className="mt-2 text-2xl font-bold">{stats.users}</p>
                  <p className="text-xs text-blue-100">Active member profiles</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Bookings
                  </p>
                  <p className="mt-2 text-2xl font-bold">{stats.bookings}</p>
                  <p className="text-xs text-blue-100">Facility requests total</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Users</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.users}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Staff: {stats.staff} • Admins: {stats.admins}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Facility Bookings</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.bookings}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Approved: {stats.approvedBookings} • Pending: {stats.pendingBookings}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Coach Requests</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.coachBookings}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Pending: {stats.pendingCoachBookings}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Open Maintenance</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.maintenanceOpen}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Inventory alerts: {stats.lowStockItems}
              </p>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Booking Trend
              </h3>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={bookingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Booking Status
              </h3>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Facility Usage
              </h3>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={facilityUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bookings" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                Maintenance Priority
              </h3>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={maintenancePriorityData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {maintenancePriorityData.map((entry, index) => (
                        <Cell
                          key={`priority-${entry.name}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-xl font-bold text-slate-900">
              Recent System Activity
            </h3>

            {recentLogs.length === 0 ? (
              <p className="text-slate-500">No recent activity found.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log, index) => (
                  <div
                    key={`${log.type}-${index}`}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{log.type}</p>
                        <p className="mt-1 text-sm text-slate-600">{log.text}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(log.date).toLocaleString()}
                      </p>
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