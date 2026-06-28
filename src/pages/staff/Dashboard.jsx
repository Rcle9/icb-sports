import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

export default function StaffDashboard() {
  const channelRef = useRef(null);
  const intervalRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    facility: 0,
    inventory: 0,
    maintenance: 0,
    totalPending: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState([]);

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
          () => loadDashboardData(mounted)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory" },
          () => loadDashboardData(mounted)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "maintenance_requests" },
          () => loadDashboardData(mounted)
        )
        .subscribe();

      channelRef.current = channel;

      intervalRef.current = setInterval(() => {
        loadDashboardData(mounted);
      }, 3000);
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

  async function loadDashboardData(mounted = true) {
    try {
      if (mounted) setLoading(true);

      const [
        pendingFacility,
        inventoryItems,
        maintenanceOpen,
        recentPendingBookings,
        activeMaintenance,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase.from("inventory").select("*", { count: "exact", head: true }),

        supabase
          .from("maintenance_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "open", "in_progress"]),

        supabase
          .from("bookings")
          .select("*, facilities (*)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),

        supabase
          .from("maintenance_requests")
          .select("*")
          .in("status", ["pending", "open", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!mounted) return;

      const facilityCount = pendingFacility.count || 0;

      setStats({
        facility: facilityCount,
        inventory: inventoryItems.count || 0,
        maintenance: maintenanceOpen.count || 0,
        totalPending: facilityCount + (maintenanceOpen.count || 0),
      });

      setRecentBookings(recentPendingBookings.data || []);
      setMaintenanceAlerts(activeMaintenance.data || []);
    } catch (error) {
      console.error("Staff dashboard update error:", error.message);
    } finally {
      if (mounted) setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Dashboard" />

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-semibold">
                  Operations Control Center
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Review facility requests and keep daily operations moving.
                </h2>

                <p className="mt-2 text-sm text-blue-50">
                  Monitor approvals, maintenance alerts, and inventory updates.
                </p>
              </div>

              <div className="hidden gap-4 md:flex">
                <div className="rounded-2xl bg-white/10 px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Pending
                  </p>
                  <p className="text-2xl font-black">{stats.facility}</p>
                </div>

                <div className="rounded-2xl bg-white/10 px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Maintenance
                  </p>
                  <p className="text-2xl font-black">{stats.maintenance}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard title="Facility Bookings" value={stats.facility} />
            <StatCard title="Inventory Items" value={stats.inventory} />
            <StatCard title="Maintenance" value={stats.maintenance} />
            <StatCard title="Total Pending" value={stats.totalPending} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black">Recent Facility Bookings</h3>

              {loading ? (
                <p className="mt-4 text-sm text-slate-500">Updating...</p>
              ) : recentBookings.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No pending facility bookings.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <h4 className="font-bold">
                        {booking.facilities?.name || "Facility Booking"}
                      </h4>

                      <p className="text-sm text-slate-500">
                        {booking.booking_date} • {booking.start_time} -{" "}
                        {booking.end_time}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase text-orange-500">
                        {booking.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black">Maintenance Alerts</h3>

              {loading ? (
                <p className="mt-4 text-sm text-slate-500">Updating...</p>
              ) : maintenanceAlerts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No issues found.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {maintenanceAlerts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <h4 className="font-bold">
                        {item.title ||
                          item.issue ||
                          item.request_type ||
                          "Maintenance Request"}
                      </h4>

                      <p className="text-sm text-slate-500">
                        {item.description || item.details || "No description"}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase text-orange-500">
                        {item.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">{value}</h3>
    </div>
  );
}