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
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "coach_bookings" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, loadDashboard)
      .subscribe();

    return () => supabase.removeChannel(channel);
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
        supabase.from("bookings").select(`*, facilities (id, name, type)`),
        supabase.from("coach_bookings").select("*"),
        supabase.from("inventory").select("*"),
        supabase.from("maintenance_requests").select("*"),
      ]);

      const profiles = profilesRes.data || [];
      const facilities = facilitiesRes.data || [];
      const bookings = bookingsRes.data || [];
      const coachBookings = coachBookingsRes.data || [];
      const inventory = inventoryRes.data || [];
      const maintenance = maintenanceRes.data || [];

      setStats({
        users: profiles.filter((p) => p.role === "user").length,
        staff: profiles.filter((p) => p.role === "staff").length,
        admins: profiles.filter((p) => p.role === "admin").length,
        facilities: facilities.length,
        bookings: bookings.length,
        approvedBookings: bookings.filter((b) => b.status === "approved").length,
        pendingBookings: bookings.filter((b) => b.status === "pending").length,
        rejectedBookings: bookings.filter((b) => b.status === "rejected").length,
        coachBookings: coachBookings.length,
        pendingCoachBookings: coachBookings.filter((b) => b.status === "pending").length,
        inventoryItems: inventory.length,
        lowStockItems: inventory.filter((i) => i.status === "low_stock" || i.status === "out_of_stock").length,
        maintenanceOpen: maintenance.filter((m) =>
          m.status === "pending" || m.status === "in_progress" || m.status === "replacement_requested"
        ).length,
      });

      const groupedTrend = {};
      bookings.forEach((booking) => {
        const key = booking.booking_date || booking.created_at?.split("T")[0];
        if (!key) return;
        groupedTrend[key] = (groupedTrend[key] || 0) + 1;
      });

      setBookingTrend(
        Object.keys(groupedTrend)
          .sort((a, b) => new Date(a) - new Date(b))
          .slice(-7)
          .map((date) => ({
            date: formatDateLabel(date),
            bookings: groupedTrend[date],
          }))
      );

      const groupedFacility = {};
      bookings.forEach((booking) => {
        const name = booking.facilities?.name || "Unknown";
        groupedFacility[name] = (groupedFacility[name] || 0) + 1;
      });

      setFacilityUsage(
        Object.keys(groupedFacility).map((name) => ({
          name,
          bookings: groupedFacility[name],
        }))
      );

      setBookingStatusData([
        { name: "Approved", value: bookings.filter((b) => b.status === "approved").length },
        { name: "Pending", value: bookings.filter((b) => b.status === "pending").length },
        { name: "Rejected", value: bookings.filter((b) => b.status === "rejected").length },
      ]);

      const priority = { low: 0, medium: 0, high: 0, critical: 0 };
      maintenance.forEach((m) => {
        if (priority[m.priority] !== undefined) priority[m.priority] += 1;
      });

      setMaintenancePriorityData([
        { name: "Low", value: priority.low },
        { name: "Medium", value: priority.medium },
        { name: "High", value: priority.high },
        { name: "Critical", value: priority.critical },
      ]);

      setRecentLogs(
        [
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
          .slice(0, 8)
      );
    } finally {
      setLoading(false);
    }
  }

  const pieColors = useMemo(() => ["#16a34a", "#f59e0b", "#dc2626", "#2563eb"], []);

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Admin Dashboard" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">Executive System Overview</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Monitor the entire InCredoBall ecosystem.
            </h2>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-black">Users</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : stats.users}
              </h2>
              <p className="mt-2 text-xs text-slate-700">
                Staff: {stats.staff} • Admins: {stats.admins}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Facility Bookings</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : stats.bookings}
              </h2>
              <p className="mt-2 text-xs text-slate-700">
                Approved: {stats.approvedBookings} • Pending: {stats.pendingBookings}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Coach Requests</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : stats.coachBookings}
              </h2>
              <p className="mt-2 text-xs text-slate-700">
                Pending: {stats.pendingCoachBookings}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Open Maintenance</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : stats.maintenanceOpen}
              </h2>
              <p className="mt-2 text-xs text-slate-700">
                Inventory alerts: {stats.lowStockItems}
              </p>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2 chart-wrap">
              <h3 className="mb-4 text-xl font-bold text-black">Booking Trend</h3>
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

            <Card className="chart-wrap">
              <h3 className="mb-4 text-xl font-bold text-black">Booking Status</h3>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={bookingStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
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
            <Card className="xl:col-span-2 chart-wrap">
              <h3 className="mb-4 text-xl font-bold text-black">Facility Usage</h3>
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

            <Card className="chart-wrap">
              <h3 className="mb-4 text-xl font-bold text-black">Maintenance Priority</h3>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={maintenancePriorityData} dataKey="value" nameKey="name" outerRadius={100} label>
                      {maintenancePriorityData.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
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
            <h3 className="mb-4 text-xl font-bold text-black">Recent System Activity</h3>
            {recentLogs.length === 0 ? (
              <p className="text-black">No recent activity found.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log, index) => (
                  <div key={`${log.type}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-black">{log.type}</p>
                        <p className="mt-1 text-sm text-black">{log.text}</p>
                      </div>
                      <p className="text-xs text-slate-700">
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