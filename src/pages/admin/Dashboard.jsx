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

function formatDateLabel(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [bookingsRes, maintenanceRes, usersRes, facilitiesRes] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("*, facilities (*)")
            .order("booking_date", { ascending: true }),

          supabase
            .from("maintenance_requests")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase.from("profiles").select("*"),

          supabase.from("facilities").select("*"),
        ]);

      setBookings(bookingsRes.data || []);
      setMaintenance(maintenanceRes.data || []);
      setUsers(usersRes.data || []);
      setFacilities(facilitiesRes.data || []);
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

    return Object.values(grouped).sort(
      (a, b) => new Date(a.rawDate) - new Date(b.rawDate)
    );
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
    const approved = bookings.filter((b) => b.status === "approved").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;

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
    const normalizedUsers = users.map((user) => ({
      ...user,
      role: String(user.role || "user").toLowerCase(),
    }));

    return {
      users: normalizedUsers.length,
      staff: normalizedUsers.filter((u) => u.role === "staff").length,
      admins: normalizedUsers.filter((u) => u.role === "admin").length,
      facilities: facilities.length,
      bookings: bookings.length,
      approved: bookings.filter((b) => b.status === "approved").length,
      pending: bookings.filter((b) => b.status === "pending").length,
      openMaintenance: maintenance.filter((m) =>
        ["pending", "open", "in_progress"].includes(m.status)
      ).length,
    };
  }, [users, bookings, maintenance, facilities]);

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Admin Dashboard" />

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white">
            <p className="text-sm font-semibold">Admin Analytics</p>

            <h2 className="mt-2 text-3xl font-black">
              Track facility bookings, usage trends, and system activity.
            </h2>

            <p className="mt-2 text-sm text-blue-50">
              Monitor facility reservations, maintenance concerns, user roles,
              and operational reports from one dashboard.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Users"
              value={stats.users}
              sub={`Staff: ${stats.staff} • Admins: ${stats.admins}`}
            />

            <StatCard
              title="Facilities"
              value={stats.facilities}
              sub="Managed sports facilities"
            />

            <StatCard
              title="Facility Bookings"
              value={stats.bookings}
              sub={`Approved: ${stats.approved} • Pending: ${stats.pending}`}
            />

            <StatCard
              title="Open Maintenance"
              value={stats.openMaintenance}
              sub="Active repair requests"
            />
          </section>

          {loading ? (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
              Loading dashboard...
            </div>
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}