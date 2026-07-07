// src/pages/staff/Dashboard.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
  Wrench,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = cleanTime(time).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function normalizeCompletionStatus(status) {
  return String(status || "not_completed").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || booking?.facility_name || "Facility";
}

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || booking?.customer_name || "User";
}

function getCustomerContact(booking) {
  return (
    booking?.walk_in_contact_number ||
    booking?.contact_number ||
    booking?.profiles?.email ||
    "-"
  );
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getPaidAmount(booking) {
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (paymentStatus === "paid") {
    return Number(booking?.amount_paid || getBookingTotal(booking) || 0);
  }

  return Number(booking?.amount_paid || 0);
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function getPaymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "unpaid") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function getStockStatus(item) {
  const quantity = Number(item?.quantity || 0);
  const threshold = Number(
    item?.low_stock_threshold || item?.min_threshold || item?.minimum_stock || 5
  );

  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";

  return "in_stock";
}

function getStockStatusClass(status) {
  if (status === "out_of_stock") return "bg-red-100 text-red-700";
  if (status === "low_stock") return "bg-orange-100 text-orange-700";

  return "bg-green-100 text-green-700";
}

function getReservationMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function isActiveBooking(booking) {
  const status = normalizeStatus(booking?.status);

  return ["reserved", "pending", "approved"].includes(status);
}

function sortBySchedule(a, b) {
  const valueA = `${a.booking_date || ""} ${cleanTime(a.start_time)}`;
  const valueB = `${b.booking_date || ""} ${cleanTime(b.start_time)}`;

  return valueA.localeCompare(valueB);
}

export default function StaffDashboard() {
  const today = getTodayDate();

  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const todayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === today);
  }, [bookings, today]);

  const pendingPaymentBookings = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          normalizePaymentStatus(booking.payment_status) ===
          "pending_verification"
      )
      .sort(
        (a, b) =>
          new Date(b.payment_submitted_at || b.updated_at || 0) -
          new Date(a.payment_submitted_at || a.updated_at || 0)
      )
      .slice(0, 6);
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        return booking.booking_date >= today && isActiveBooking(booking);
      })
      .sort(sortBySchedule)
      .slice(0, 8);
  }, [bookings, today]);

  const todaySchedule = useMemo(() => {
    return todayBookings
      .filter((booking) => isActiveBooking(booking))
      .sort(sortBySchedule)
      .slice(0, 8);
  }, [todayBookings]);

  const activeMaintenance = useMemo(() => {
    return maintenanceBlocks
      .filter((block) => normalizeStatus(block.status) === "active")
      .sort((a, b) => {
        const valueA = `${a.maintenance_date || ""} ${cleanTime(a.start_time)}`;
        const valueB = `${b.maintenance_date || ""} ${cleanTime(b.start_time)}`;

        return valueA.localeCompare(valueB);
      })
      .slice(0, 6);
  }, [maintenanceBlocks]);

  const lowStockItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const status = getStockStatus(item);
        return status === "low_stock" || status === "out_of_stock";
      })
      .slice(0, 6);
  }, [inventory]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);
  }, [bookings]);

  const summary = useMemo(() => {
    const todayPaidRevenue = todayBookings.reduce(
      (sum, booking) => sum + getPaidAmount(booking),
      0
    );

    const pendingPayments = bookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) ===
        "pending_verification"
    ).length;

    const approvedToday = todayBookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    ).length;

    const activeReservations = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "reserved"
    ).length;

    const pendingBookings = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "pending"
    ).length;

    const completedToday = todayBookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const noShowToday = todayBookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "no_show"
    ).length;

    const rejectedPayments = bookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "rejected_payment"
    ).length;

    const unpaidReservations = bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      return ["reserved", "pending"].includes(status) && paymentStatus === "unpaid";
    }).length;

    const walkInToday = todayBookings.filter((booking) => booking.is_walk_in).length;
    const onlineToday = todayBookings.filter((booking) => !booking.is_walk_in).length;

    return {
      todayBookings: todayBookings.length,
      todayPaidRevenue,
      pendingPayments,
      approvedToday,
      activeReservations,
      pendingBookings,
      completedToday,
      noShowToday,
      rejectedPayments,
      unpaidReservations,
      walkInToday,
      onlineToday,
      activeMaintenance: activeMaintenance.length,
      lowStock: lowStockItems.length,
      inventoryItems: inventory.length,
    };
  }, [bookings, todayBookings, inventory, activeMaintenance, lowStockItems]);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`staff-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_maintenance_blocks" },
        () => loadDashboard(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (*),
          profiles:user_id (
  id,
  full_name,
  email,
  role
)
        `)
        .order("created_at", { ascending: false });

      if (bookingError) throw bookingError;

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .order("name", { ascending: true });

      if (inventoryError) throw inventoryError;

      let maintenanceData = [];

      try {
        const { data, error } = await supabase
          .from("facility_maintenance_blocks")
          .select(`
            *,
            facilities (*),
            profiles:created_by (
              id,
              full_name,
              role
            )
          `)
          .order("maintenance_date", { ascending: true });

        if (error) throw error;

        maintenanceData = data || [];
      } catch (maintenanceError) {
        console.error(
          "Maintenance blocks unavailable:",
          maintenanceError?.message || maintenanceError
        );
        maintenanceData = [];
      }

      setBookings(bookingData || []);
      setInventory(inventoryData || []);
      setMaintenanceBlocks(maintenanceData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load staff dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard(false);
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Staff Dashboard"
            subtitle="Daily operations, payments, reservations, and facility alerts"
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Staff Operations Center
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Manage today’s bookings and payment reviews.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  Monitor payment proof uploads, active reservations, approved
                  bookings, maintenance blocks, low stock alerts, and upcoming
                  facility schedules.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Today" value={summary.todayBookings} />
                <HeroStat label="Paid Today" value={money(summary.todayPaidRevenue)} />
                <HeroStat label="Payment Review" value={summary.pendingPayments} />
                <HeroStat label="Low Stock" value={summary.lowStock} />
              </div>
            </div>
          </section>

          <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="icb-eyebrow">Quick Actions</p>
              <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                Daily workflow
              </h3>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="icb-btn-light"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {loading ? (
            <section className="icb-card p-6">
              <p className="text-sm font-semibold text-slate-500">
                Loading staff dashboard...
              </p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Today’s Bookings"
                  value={summary.todayBookings}
                  description={`${summary.onlineToday} online • ${summary.walkInToday} walk-in`}
                  icon={<CalendarCheck size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Payment Review"
                  value={summary.pendingPayments}
                  description="Uploaded proofs waiting for verification"
                  icon={<CreditCard size={21} />}
                  tone="orange"
                />

                <MetricCard
                  title="Approved Today"
                  value={summary.approvedToday}
                  description={`Paid today: ${money(summary.todayPaidRevenue)}`}
                  icon={<CheckCircle2 size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Active Reservations"
                  value={summary.activeReservations}
                  description="Reserved slots waiting for payment or review"
                  icon={<Clock size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="Pending Bookings"
                  value={summary.pendingBookings}
                  description="Requests waiting for staff action"
                  icon={<AlertCircle size={21} />}
                  tone="yellow"
                />

                <MetricCard
                  title="Completed Today"
                  value={summary.completedToday}
                  description={`No-show today: ${summary.noShowToday}`}
                  icon={<ShieldCheck size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Maintenance Blocks"
                  value={summary.activeMaintenance}
                  description="Active facility maintenance schedules"
                  icon={<Wrench size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="Low Stock"
                  value={summary.lowStock}
                  description={`${summary.inventoryItems} total inventory item(s)`}
                  icon={<Package size={21} />}
                  tone="red"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
                <QuickActionCard
                  icon={<CalendarCheck size={23} />}
                  title="Manage Bookings"
                  description="Verify payments, review reservations, and issue receipts."
                  to="/staff/manage-bookings"
                />

                <QuickActionCard
                  icon={<UsersRound size={23} />}
                  title="Walk-in Booking"
                  description="Create a booking for customers at the counter."
                  to="/staff/walk-in-booking"
                />

                <QuickActionCard
                  icon={<ShoppingBag size={23} />}
                  title="Inventory"
                  description="Manage product stock, pricing, and low stock alerts."
                  to="/staff/inventory"
                />

                <QuickActionCard
                  icon={<Wrench size={23} />}
                  title="Maintenance"
                  description="Track facility issues, repairs, and maintenance work."
                  to="/staff/maintenance"
                />

                <QuickActionCard
                  icon={<FileText size={23} />}
                  title="Activity Logs"
                  description="Review system actions and staff activity history."
                  to="/staff/activity-logs"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <DashboardPanel
                  eyebrow="Payments"
                  title="Payment proof waiting for review"
                  description="Open these requests in Manage Bookings to verify or reject proof."
                  actionText="Review Payments"
                  actionPath="/staff/manage-bookings"
                >
                  {pendingPaymentBookings.length === 0 ? (
                    <EmptyState text="No payment proof waiting for review." />
                  ) : (
                    <div className="space-y-3">
                      {pendingPaymentBookings.map((booking) => (
                        <PaymentReviewCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </DashboardPanel>

                <DashboardPanel
                  eyebrow="Today"
                  title="Today’s facility schedule"
                  description="Active bookings scheduled for today."
                  actionText="Open Calendar"
                  actionPath="/staff/manage-bookings"
                >
                  {todaySchedule.length === 0 ? (
                    <EmptyState text="No active bookings scheduled today." />
                  ) : (
                    <div className="space-y-3">
                      {todaySchedule.map((booking) => (
                        <BookingRow key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </DashboardPanel>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <DashboardPanel
                  eyebrow="Upcoming"
                  title="Upcoming bookings"
                  description="Nearest active bookings in the schedule."
                  actionText="Manage"
                  actionPath="/staff/manage-bookings"
                >
                  {upcomingBookings.length === 0 ? (
                    <EmptyState text="No upcoming bookings found." />
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => (
                        <BookingRow key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </DashboardPanel>

                <DashboardPanel
                  eyebrow="Maintenance"
                  title="Active maintenance alerts"
                  description="Facilities with active blocked schedules."
                  actionText="Open Calendar"
                  actionPath="/staff/manage-bookings"
                >
                  {activeMaintenance.length === 0 ? (
                    <EmptyState text="No active maintenance blocks." />
                  ) : (
                    <div className="space-y-3">
                      {activeMaintenance.map((block) => (
                        <MaintenanceRow key={block.id} block={block} />
                      ))}
                    </div>
                  )}
                </DashboardPanel>

                <DashboardPanel
                  eyebrow="Inventory"
                  title="Low stock alerts"
                  description="Inventory items that need restocking."
                  actionText="Inventory"
                  actionPath="/staff/inventory"
                >
                  {lowStockItems.length === 0 ? (
                    <EmptyState text="No low stock items." />
                  ) : (
                    <div className="space-y-3">
                      {lowStockItems.map((item) => (
                        <InventoryRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </DashboardPanel>
              </section>

              <DashboardPanel
                eyebrow="Recent"
                title="Recent booking activity"
                description="Latest booking records across the system."
                actionText="View All"
                actionPath="/staff/manage-bookings"
              >
                {recentBookings.length === 0 ? (
                  <EmptyState text="No recent bookings found." />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Customer
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Facility
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Schedule
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Amount
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Status
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Payment
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="border border-[#DED8D2] px-4 py-3 font-bold text-[#0B1F33]">
                              {getCustomerName(booking)}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              {getFacilityName(booking)}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              {formatDate(booking.booking_date)}
                              <br />
                              <span className="text-xs text-slate-500">
                                {formatTime(booking.start_time)} -{" "}
                                {formatTime(booking.end_time)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-[#C97B6C]">
                              {money(getBookingTotal(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <Badge className={getStatusClass(booking.status)}>
                                {formatStatusLabel(booking.status)}
                              </Badge>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <Badge
                                className={getPaymentStatusClass(
                                  booking.payment_status
                                )}
                              >
                                {formatStatusLabel(booking.payment_status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardPanel>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-lg font-black sm:text-xl">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "slate" }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tones[tone] || tones.slate
          }`}
        >
          {icon}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
            tones[tone] || tones.slate
          }`}
        >
          {title}
        </span>
      </div>

      <h3 className="mt-5 break-words text-3xl font-black text-[#0B1F33]">
        {value}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="icb-card icb-card-hover group block p-5 transition hover:-translate-y-1"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#C97B6C] transition group-hover:bg-[#C97B6C] group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black text-[#0B1F33]">{title}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function DashboardPanel({
  eyebrow,
  title,
  description,
  actionText,
  actionPath,
  children,
}) {
  return (
    <section className="icb-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="icb-eyebrow">{eyebrow}</p>

          <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">{title}</h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>

        {actionPath && (
          <Link to={actionPath} className="icb-btn-light">
            {actionText || "Open"}
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}

function PaymentReviewCard({ booking }) {
  return (
    <Link
      to={`/staff/manage-bookings?highlight=${booking.id}`}
      className="block rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4 transition hover:border-[#C97B6C] hover:bg-white"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#0B1F33]">
            {getCustomerName(booking)}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {getFacilityName(booking)} • {formatDate(booking.booking_date)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Contact: {getCustomerContact(booking)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Submitted: {formatDateTime(booking.payment_submitted_at)}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-lg font-black text-[#C97B6C]">
            {money(booking.amount_paid || getBookingTotal(booking))}
          </p>

          <Badge className={getPaymentStatusClass(booking.payment_status)}>
            {formatStatusLabel(booking.payment_status)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function BookingRow({ booking }) {
  const minutesLeft = getReservationMinutesLeft(booking);

  return (
    <Link
      to={`/staff/manage-bookings?highlight=${booking.id}`}
      className="block rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C] hover:bg-[#FBFAF9]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {getCustomerName(booking)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          {minutesLeft !== null &&
            normalizeStatus(booking.status) === "reserved" &&
            ["unpaid", "rejected_payment"].includes(
              normalizePaymentStatus(booking.payment_status)
            ) && (
              <p className="mt-2 text-xs font-black text-orange-600">
                {minutesLeft} minute(s) left before expiration
              </p>
            )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusClass(booking.status)}>
            {formatStatusLabel(booking.status)}
          </Badge>

          <Badge className={getPaymentStatusClass(booking.payment_status)}>
            {formatStatusLabel(booking.payment_status)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function MaintenanceRow({ block }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
          <Wrench size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black text-purple-800">
            {block.facilities?.name || "Facility"}
          </p>

          <p className="mt-1 text-sm font-semibold text-purple-700">
            {formatDate(block.maintenance_date)} • {formatTime(block.start_time)} -{" "}
            {formatTime(block.end_time)}
          </p>

          <p className="mt-1 text-xs font-semibold text-purple-600">
            {block.reason || "Facility maintenance"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InventoryRow({ item }) {
  const status = getStockStatus(item);
  const threshold =
    item?.low_stock_threshold || item?.min_threshold || item?.minimum_stock || 5;

  return (
    <Link
      to="/staff/inventory"
      className="block rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C] hover:bg-[#FBFAF9]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#0B1F33]">
            {item.name || "Inventory Item"}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {item.category || "Uncategorized"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Quantity: {Number(item.quantity || 0)} • Threshold: {threshold}
          </p>
        </div>

        <Badge className={getStockStatusClass(status)}>
          {formatStatusLabel(status)}
        </Badge>
      </div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}>
      {children}
    </span>
  );
}