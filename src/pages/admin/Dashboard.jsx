// src/pages/admin/Dashboard.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileBarChart,
  Landmark,
  RefreshCw,
  Settings,
  ShieldCheck,
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

function groupCount(items, keyGetter) {
  const map = new Map();

  items.forEach((item) => {
    const key = keyGetter(item);
    map.set(key, Number(map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function AdminDashboard() {
  const today = getTodayDate();

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const todayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === today);
  }, [bookings, today]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);
        return booking.booking_date >= today && ["reserved", "pending", "approved"].includes(status);
      })
      .sort((a, b) => {
        const dateA = `${a.booking_date || ""} ${cleanTime(a.start_time)}`;
        const dateB = `${b.booking_date || ""} ${cleanTime(b.start_time)}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 8);
  }, [bookings, today]);

  const pendingPaymentBookings = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          normalizePaymentStatus(booking.payment_status) ===
          "pending_verification"
      )
      .sort((a, b) => new Date(b.payment_submitted_at || b.updated_at || 0) - new Date(a.payment_submitted_at || a.updated_at || 0))
      .slice(0, 6);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6);
  }, [bookings]);

  const activeMaintenance = useMemo(() => {
    return maintenanceBlocks
      .filter((block) => normalizeStatus(block.status) === "active")
      .sort((a, b) => {
        const dateA = `${a.maintenance_date || ""} ${cleanTime(a.start_time)}`;
        const dateB = `${b.maintenance_date || ""} ${cleanTime(b.start_time)}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 6);
  }, [maintenanceBlocks]);

  const facilityRanking = useMemo(() => {
    return groupCount(bookings, (booking) => getFacilityName(booking)).slice(0, 5);
  }, [bookings]);

  const topFacility = facilityRanking[0] || { name: "-", value: 0 };

  const summary = useMemo(() => {
    const todayPaidRevenue = todayBookings.reduce(
      (sum, booking) => sum + getPaidAmount(booking),
      0
    );

    const totalPaidRevenue = bookings.reduce(
      (sum, booking) => sum + getPaidAmount(booking),
      0
    );

    const todayExpectedRevenue = todayBookings.reduce(
      (sum, booking) => sum + getBookingTotal(booking),
      0
    );

    const activeReservations = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "reserved"
    ).length;

    const pendingPayments = bookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) ===
        "pending_verification"
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

    const approved = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    ).length;

    const reserved = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "reserved"
    ).length;

    const cancelled = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "cancelled"
    ).length;

    const expired = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "expired"
    ).length;

    const completed = bookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const noShow = bookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "no_show"
    ).length;

    const users = profiles.filter(
      (profile) => String(profile.role || "user").toLowerCase() === "user"
    ).length;

    const staff = profiles.filter(
      (profile) => String(profile.role || "").toLowerCase() === "staff"
    ).length;

    const admins = profiles.filter(
      (profile) => String(profile.role || "").toLowerCase() === "admin"
    ).length;

    const onlineBookings = bookings.filter((booking) => !booking.is_walk_in).length;
    const walkInBookings = bookings.filter((booking) => booking.is_walk_in).length;

    return {
      todayBookings: todayBookings.length,
      todayPaidRevenue,
      todayExpectedRevenue,
      totalPaidRevenue,
      activeReservations,
      pendingPayments,
      rejectedPayments,
      unpaidReservations,
      approved,
      reserved,
      cancelled,
      expired,
      completed,
      noShow,
      users,
      staff,
      admins,
      onlineBookings,
      walkInBookings,
      facilities: facilities.length,
      activeMaintenance: activeMaintenance.length,
    };
  }, [bookings, facilities, profiles, todayBookings, activeMaintenance]);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`admin-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
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

      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (facilityError) throw facilityError;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

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
      setFacilities(facilityData || []);
      setProfiles(profileData || []);
      setMaintenanceBlocks(maintenanceData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load admin dashboard.");
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
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Admin Dashboard"
            subtitle="System overview, booking payments, and facility activity"
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Admin Command Center
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Monitor bookings, payments, users, and facilities.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  View today’s bookings, payment verifications, active
                  reservations, facility usage, and quick system actions in one
                  dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Today Bookings" value={summary.todayBookings} />
                <HeroStat label="Today Paid" value={money(summary.todayPaidRevenue)} />
                <HeroStat label="Payment Review" value={summary.pendingPayments} />
                <HeroStat label="Users" value={summary.users} />
              </div>
            </div>
          </section>

          <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="icb-eyebrow">Dashboard Actions</p>
              <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                Quick access
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
                Loading admin dashboard...
              </p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Today’s Bookings"
                  value={summary.todayBookings}
                  description="Bookings scheduled for today"
                  icon={<CalendarCheck size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Today’s Paid Revenue"
                  value={money(summary.todayPaidRevenue)}
                  description={`Expected today: ${money(summary.todayExpectedRevenue)}`}
                  icon={<Landmark size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Payment Verifications"
                  value={summary.pendingPayments}
                  description="Payment proofs waiting for staff review"
                  icon={<CreditCard size={21} />}
                  tone="orange"
                />

                <MetricCard
                  title="Active Reservations"
                  value={summary.activeReservations}
                  description="Reserved slots not yet fully approved"
                  icon={<Clock size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="Approved Bookings"
                  value={summary.approved}
                  description="Total approved records"
                  icon={<CheckCircle2 size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Cancelled Bookings"
                  value={summary.cancelled}
                  description="Cancelled reservation records"
                  icon={<XCircle size={21} />}
                  tone="red"
                />

                <MetricCard
                  title="Expired Bookings"
                  value={summary.expired}
                  description="Expired unpaid reservations"
                  icon={<AlertCircle size={21} />}
                  tone="orange"
                />

                <MetricCard
                  title="Completed Bookings"
                  value={summary.completed}
                  description={`No-show records: ${summary.noShow}`}
                  icon={<ShieldCheck size={21} />}
                  tone="blue"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                <QuickActionCard
                  icon={<CalendarCheck size={24} />}
                  title="Manage Bookings"
                  description="Review reservations, verify payments, reject proof, and issue receipts."
                  to="/admin/manage-bookings"
                />

                <QuickActionCard
                  icon={<FileBarChart size={24} />}
                  title="Reports"
                  description="View revenue, facility performance, completion, and payment reports."
                  to="/admin/reports"
                />

                <QuickActionCard
                  icon={<Settings size={24} />}
                  title="Payment Settings"
                  description="Update GCash details, bank information, QR codes, and reservation timer."
                  to="/admin/payment-settings"
                />

                <QuickActionCard
                  icon={<ShieldCheck size={24} />}
                  title="Facility Management"
                  description="Add, edit, activate, and manage facility information."
                  to="/admin/facilities"
                />

                <QuickActionCard
                  icon={<UsersRound size={24} />}
                  title="User Management"
                  description="Manage user roles and review system accounts."
                  to="/admin/users"
                />

                <QuickActionCard
                  icon={<BarChart3 size={24} />}
                  title="Command Center"
                  description="Open the admin operations command overview."
                  to="/admin/command-center"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="icb-card p-5 sm:p-6">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="icb-eyebrow">Payment Alerts</p>
                      <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                        Pending payment verification
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Payments submitted by users that need staff/admin review.
                      </p>
                    </div>

                    <Link to="/admin/manage-bookings" className="icb-btn-light">
                      View All
                    </Link>
                  </div>

                  {pendingPaymentBookings.length === 0 ? (
                    <EmptyState text="No pending payment verifications." />
                  ) : (
                    <div className="space-y-3">
                      {pendingPaymentBookings.map((booking) => (
                        <PaymentAlertCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="icb-card p-5 sm:p-6">
                  <div className="mb-5">
                    <p className="icb-eyebrow">Facility Performance</p>
                    <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                      Most booked facility
                    </h3>
                  </div>

                  <div className="rounded-[28px] bg-[#0B1F33] p-5 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                      Top Facility
                    </p>

                    <h4 className="mt-3 text-3xl font-black">
                      {topFacility.name}
                    </h4>

                    <p className="mt-2 text-sm font-semibold text-white/75">
                      {topFacility.value} booking(s) recorded.
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {facilityRanking.length === 0 ? (
                      <EmptyState text="No facility ranking data yet." />
                    ) : (
                      facilityRanking.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[#DED8D2] bg-white px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-black text-[#0B1F33]">
                              {index + 1}. {item.name}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Facility ranking
                            </p>
                          </div>

                          <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black text-[#C97B6C]">
                            {item.value}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <DashboardPanel
                  eyebrow="Upcoming"
                  title="Upcoming bookings"
                  description="Nearest reserved, pending, and approved bookings."
                  actionText="Manage"
                  actionPath="/admin/manage-bookings"
                >
                  {upcomingBookings.length === 0 ? (
                    <EmptyState text="No upcoming bookings." />
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
                  title="Active maintenance blocks"
                  description="Facility times currently blocked for maintenance."
                  actionText="Open Calendar"
                  actionPath="/admin/manage-bookings"
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
              </section>

              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SmallInfoCard
                  label="Facilities"
                  value={summary.facilities}
                  description="Total facility records"
                />
                <SmallInfoCard
                  label="Staff"
                  value={summary.staff}
                  description="Staff accounts"
                />
                <SmallInfoCard
                  label="Admins"
                  value={summary.admins}
                  description="Admin accounts"
                />
                <SmallInfoCard
                  label="Total Paid Revenue"
                  value={money(summary.totalPaidRevenue)}
                  description="All verified payments"
                />
                <SmallInfoCard
                  label="Online Bookings"
                  value={summary.onlineBookings}
                  description="Created by customers"
                />
                <SmallInfoCard
                  label="Walk-in Bookings"
                  value={summary.walkInBookings}
                  description="Created by staff"
                />
                <SmallInfoCard
                  label="Rejected Payments"
                  value={summary.rejectedPayments}
                  description="Rejected proof uploads"
                />
                <SmallInfoCard
                  label="Unpaid Reservations"
                  value={summary.unpaidReservations}
                  description="Still waiting for payment"
                />
              </section>

              <DashboardPanel
                eyebrow="Recent Activity"
                title="Recent booking records"
                description="Latest booking activity across the system."
                actionText="View All"
                actionPath="/admin/manage-bookings"
              >
                {recentBookings.length === 0 ? (
                  <EmptyState text="No recent bookings found." />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                    <table className="w-full min-w-[920px] border-collapse text-sm">
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
                            Total
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

      <h3 className="mt-4 text-xl font-black text-[#0B1F33]">{title}</h3>

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

function PaymentAlertCard({ booking }) {
  return (
    <Link
      to={`/admin/manage-bookings?highlight=${booking.id}`}
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
  return (
    <Link
      to={`/admin/manage-bookings?highlight=${booking.id}`}
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

function SmallInfoCard({ label, value, description }) {
  return (
    <div className="icb-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <h3 className="mt-3 break-words text-2xl font-black text-[#0B1F33]">
        {value}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
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