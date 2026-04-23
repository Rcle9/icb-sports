import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";
import { getAllBookings } from "../../services/bookingService";
import { getAllCoachBookings } from "../../services/coachingService";
import { getInventory } from "../../services/inventoryService";
import { getMaintenanceRequests } from "../../services/maintenanceService";

export default function StaffDashboard() {
  const [bookingCount, setBookingCount] = useState(0);
  const [coachingCount, setCoachingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);

  const [recentBookings, setRecentBookings] = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("staff-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_requests" },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [bookings, coachBookings, inventory, maintenance] =
        await Promise.all([
          getAllBookings(),
          getAllCoachBookings(),
          getInventory(),
          getMaintenanceRequests(),
        ]);

      const pendingBookings =
        (bookings || []).filter((item) => item.status === "pending") || [];

      const pendingCoachBookings =
        (coachBookings || []).filter((item) => item.status === "pending") || [];

      const lowStockItems =
        (inventory || []).filter(
          (item) =>
            item.status === "low_stock" || item.status === "out_of_stock"
        ) || [];

      const activeMaintenance =
        (maintenance || []).filter(
          (item) =>
            item.status === "pending" ||
            item.status === "in_progress" ||
            item.status === "replacement_requested"
        ) || [];

      setBookingCount(pendingBookings.length);
      setCoachingCount(pendingCoachBookings.length);
      setLowStockCount(lowStockItems.length);
      setMaintenanceCount(activeMaintenance.length);

      setRecentBookings(pendingBookings.slice(0, 5));
      setRecentMaintenance(activeMaintenance.slice(0, 5));
    } catch (error) {
      console.error("Failed to load staff dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="Staff Dashboard" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Operations Control Center
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Review requests and keep daily operations moving.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Monitor pending approvals, low stock alerts, and maintenance
                  issues in one unified dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:w-[360px]">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-bold">{bookingCount}</p>
                  <p className="text-xs text-blue-100">Facility requests</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Coaching
                  </p>
                  <p className="mt-2 text-2xl font-bold">{coachingCount}</p>
                  <p className="text-xs text-blue-100">Pending reviews</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Pending Facility Bookings</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : bookingCount}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                New member requests awaiting action
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Pending Coaching Requests</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : coachingCount}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Review coach session submissions
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Low Stock Alerts</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : lowStockCount}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Inventory requires attention
              </p>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Active Maintenance Issues</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : maintenanceCount}
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Open repairs and replacements
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-slate-900">
                  Recent Pending Bookings
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Requests that need review right now.
                </p>
              </div>

              {loading ? (
                <p className="text-slate-500">Loading pending bookings...</p>
              ) : recentBookings.length === 0 ? (
                <p className="text-slate-500">No pending facility bookings.</p>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {booking.facilities?.name || "Facility"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {booking.booking_date} • {booking.start_time} - {booking.end_time}
                          </p>
                        </div>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-slate-900">
                  Maintenance Alerts
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Open issues currently affecting operations.
                </p>
              </div>

              {loading ? (
                <p className="text-slate-500">Loading maintenance alerts...</p>
              ) : recentMaintenance.length === 0 ? (
                <p className="text-slate-500">No active maintenance issues.</p>
              ) : (
                <div className="space-y-3">
                  {recentMaintenance.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {request.item_name}
                          </p>
                          <p className="mt-1 text-sm capitalize text-slate-500">
                            {request.request_type.replaceAll("_", " ")} • {request.priority}
                          </p>
                        </div>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold capitalize text-red-700">
                          {request.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}