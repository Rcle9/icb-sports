// src/pages/admin/CommandCenter.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  Clock,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
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

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility";
}

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || "User";
}

function getTotalAmount(booking) {
  const totalHours = Number(booking.total_hours || 0);
  const ratePerHour = Number(booking.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking.total_amount || 0) || computed;
}

function getPaidAmount(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  if (paymentStatus === "paid" || status === "approved") {
    return Number(booking.amount_paid || getTotalAmount(booking) || 0);
  }

  return 0;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
}

function getCurrentTimeValue() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function getMonthKey(value) {
  if (!value) return "Unknown";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function groupCount(items, keyGetter) {
  const map = new Map();

  items.forEach((item) => {
    const key = keyGetter(item);
    map.set(key, Number(map.get(key) || 0) + 1);
  });

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    value,
  }));
}

function groupSum(items, keyGetter, valueGetter) {
  const map = new Map();

  items.forEach((item) => {
    const key = keyGetter(item);
    const value = Number(valueGetter(item) || 0);

    map.set(key, Number(map.get(key) || 0) + value);
  });

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    value,
  }));
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "rejected") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-amber-100 text-amber-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

export default function CommandCenter() {
  const today = getTodayDate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const todayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === today);
  }, [bookings, today]);

  const todayRevenue = useMemo(() => {
    return todayBookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
  }, [todayBookings]);

  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
  }, [bookings]);

  const pendingPayments = useMemo(() => {
    return bookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "pending_verification"
    );
  }, [bookings]);

  const activeMaintenanceToday = useMemo(() => {
    return maintenanceBlocks.filter(
      (block) =>
        block.maintenance_date === today && normalizeStatus(block.status) === "active"
    );
  }, [maintenanceBlocks, today]);

  const upcomingToday = useMemo(() => {
    const nowTime = getCurrentTimeValue();

    return todayBookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);

        return (
          ["reserved", "pending", "approved"].includes(status) &&
          cleanTime(booking.end_time) > nowTime
        );
      })
      .sort((a, b) => cleanTime(a.start_time).localeCompare(cleanTime(b.start_time)))
      .slice(0, 8);
  }, [todayBookings]);

  const facilityAvailability = useMemo(() => {
    const nowTime = getCurrentTimeValue();

    return facilities.map((facility) => {
      const maintenanceNow = activeMaintenanceToday.find((block) => {
        if (String(block.facility_id) !== String(facility.id)) return false;

        return overlaps(nowTime, nowTime, block.start_time, block.end_time);
      });

      if (maintenanceNow) {
        return {
          facility,
          status: "maintenance",
          label: "Under Maintenance",
          detail: maintenanceNow.reason || "Facility maintenance",
        };
      }

      const currentBooking = todayBookings.find((booking) => {
        const status = normalizeStatus(booking.status);

        if (String(booking.facility_id) !== String(facility.id)) return false;
        if (!["reserved", "pending", "approved"].includes(status)) return false;

        return cleanTime(booking.start_time) <= nowTime && cleanTime(booking.end_time) > nowTime;
      });

      if (currentBooking) {
        const paymentStatus = normalizePaymentStatus(currentBooking.payment_status);

        if (
          normalizeStatus(currentBooking.status) === "approved" ||
          paymentStatus === "paid"
        ) {
          return {
            facility,
            status: "occupied",
            label: "Occupied",
            detail: `Until ${formatTime(currentBooking.end_time)}`,
          };
        }

        return {
          facility,
          status: "reserved",
          label: "Reserved",
          detail: `Until ${formatTime(currentBooking.end_time)}`,
        };
      }

      const nextBooking = todayBookings
        .filter((booking) => {
          const status = normalizeStatus(booking.status);

          return (
            String(booking.facility_id) === String(facility.id) &&
            ["reserved", "pending", "approved"].includes(status) &&
            cleanTime(booking.start_time) > nowTime
          );
        })
        .sort((a, b) => cleanTime(a.start_time).localeCompare(cleanTime(b.start_time)))[0];

      return {
        facility,
        status: "available",
        label: "Available Now",
        detail: nextBooking
          ? `Next at ${formatTime(nextBooking.start_time)}`
          : "No upcoming booking today",
      };
    });
  }, [facilities, todayBookings, activeMaintenanceToday]);

  const monthlyRevenue = useMemo(() => {
    return groupSum(
      bookings,
      (booking) => getMonthKey(booking.booking_date),
      (booking) => getPaidAmount(booking)
    ).slice(-6);
  }, [bookings]);

  const statusSummary = useMemo(() => {
    return groupCount(bookings, (booking) => formatStatusLabel(booking.status));
  }, [bookings]);

  const bookingSourceSummary = useMemo(() => {
    const online = bookings.filter((booking) => !booking.is_walk_in).length;
    const walkIn = bookings.filter((booking) => booking.is_walk_in).length;

    return [
      { name: "Online", value: online },
      { name: "Walk-in", value: walkIn },
    ];
  }, [bookings]);

  const topFacilities = useMemo(() => {
    return groupCount(bookings, (booking) => getFacilityName(booking))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  useEffect(() => {
    loadCommandCenter();

    const channel = supabase
      .channel(`admin-command-center-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadCommandCenter(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_maintenance_blocks" },
        () => {
          loadCommandCenter(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          loadActivityLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadCommandCenter(showLoading = true) {
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
            role
          )
        `)
        .order("booking_date", { ascending: false });

      if (bookingError) throw bookingError;

      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (facilityError) throw facilityError;

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("facility_maintenance_blocks")
        .select(`
          *,
          facilities (*)
        `)
        .eq("status", "active")
        .order("maintenance_date", { ascending: true });

      if (maintenanceError) throw maintenanceError;

      setBookings(bookingData || []);
      setFacilities(facilityData || []);
      setMaintenanceBlocks(maintenanceData || []);

      await loadActivityLogs();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load command center.");
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityLogs() {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      setActivityLogs(data || []);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadCommandCenter(false);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="admin"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Command Center"
            subtitle="Live admin monitoring for bookings, revenue, payments, and facility operations."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Premium Admin Dashboard
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  InCredoBall Command Center
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Monitor live bookings, revenue, facility availability, payment
                  verification, maintenance blocks, and recent activity in one
                  focused admin view.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Today Revenue" value={money(todayRevenue)} />
                <HeroStat label="Today Bookings" value={todayBookings.length} />
                <HeroStat label="Payment Review" value={pendingPayments.length} />
                <HeroStat label="Maintenance" value={activeMaintenanceToday.length} />
              </div>
            </div>
          </section>

          {loading ? (
            <section className="icb-card p-8">
              <p className="text-sm font-semibold text-slate-500">
                Loading command center...
              </p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Revenue"
                  value={money(totalRevenue)}
                  description="All paid and approved bookings"
                  icon={<TrendingUp size={22} />}
                  tone="green"
                />

                <MetricCard
                  title="Total Bookings"
                  value={bookings.length}
                  description="Online and walk-in bookings"
                  icon={<CalendarCheck size={22} />}
                  tone="blue"
                />

                <MetricCard
                  title="Pending Payments"
                  value={pendingPayments.length}
                  description="Needs staff verification"
                  icon={<CreditCard size={22} />}
                  tone="amber"
                />

                <MetricCard
                  title="Active Maintenance"
                  value={maintenanceBlocks.length}
                  description="Current facility blocks"
                  icon={<Wrench size={22} />}
                  tone="purple"
                />
              </section>

              <section className="icb-card mb-6 p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="icb-eyebrow">Live Overview</p>

                    <h3 className="icb-section-title mt-2">
                      Today’s Operations Snapshot
                    </h3>

                    <p className="icb-section-subtitle">
                      Current system status based on today’s schedule and active
                      facility records.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={17}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {refreshing ? "Refreshing..." : "Refresh Data"}
                  </button>
                </div>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Panel
                  title="Live Facility Availability"
                  subtitle="Current status of all facilities today."
                  icon={<Building2 size={20} />}
                >
                  {facilityAvailability.length === 0 ? (
                    <EmptyState text="No facilities found." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {facilityAvailability.map((item) => (
                        <FacilityStatusCard key={item.facility.id} item={item} />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Upcoming Today"
                  subtitle="Next active bookings for today."
                  icon={<Clock size={20} />}
                >
                  {upcomingToday.length === 0 ? (
                    <EmptyState text="No upcoming bookings today." />
                  ) : (
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {upcomingToday.map((booking) => (
                        <UpcomingBookingCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard
                  title="Monthly Revenue"
                  description="Revenue trend from paid bookings."
                  icon={<TrendingUp size={20} />}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => money(value)} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Revenue"
                        stroke="#C97B6C"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Booking Source"
                  description="Online bookings compared with walk-in bookings."
                  icon={<BarChart3 size={20} />}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingSourceSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#C97B6C" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Booking Status Summary"
                  description="Overall booking status distribution."
                  icon={<ShieldCheck size={20} />}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#0B1F33" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Top Facilities"
                  description="Most booked facilities."
                  icon={<Building2 size={20} />}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topFacilities}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Panel
                  title="Pending Payment Verifications"
                  subtitle="Bookings waiting for staff review."
                  icon={<CreditCard size={20} />}
                >
                  {pendingPayments.length === 0 ? (
                    <EmptyState text="No pending payment verifications." />
                  ) : (
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {pendingPayments.slice(0, 6).map((booking) => (
                        <PaymentReviewCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Active Maintenance Blocks"
                  subtitle="Facilities currently blocked for maintenance."
                  icon={<AlertTriangle size={20} />}
                >
                  {maintenanceBlocks.length === 0 ? (
                    <EmptyState text="No active maintenance blocks." />
                  ) : (
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {maintenanceBlocks.slice(0, 6).map((block) => (
                        <MaintenanceCard key={block.id} block={block} />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <Panel
                title="Recent Activity"
                subtitle="Latest system actions and audit trail updates."
                icon={<Activity size={20} />}
              >
                {activityLogs.length === 0 ? (
                  <EmptyState text="No recent activity logs." />
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <ActivityLogCard key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="safe-text mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "coral" }) {
  const toneClass = {
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
  }[tone];

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="safe-text mt-3 text-3xl font-black text-[#0B1F33]">
            {value}
          </h3>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FacilityStatusCard({ item }) {
  const statusClass = {
    available: "border-green-200 bg-green-50 text-green-700",
    occupied: "border-slate-300 bg-slate-100 text-slate-700",
    reserved: "border-amber-200 bg-amber-50 text-amber-700",
    maintenance: "border-purple-200 bg-purple-50 text-purple-700",
  }[item.status];

  const badgeClass = {
    available: "bg-green-100 text-green-700",
    occupied: "bg-slate-200 text-slate-700",
    reserved: "bg-amber-100 text-amber-700",
    maintenance: "bg-purple-100 text-purple-700",
  }[item.status];

  return (
    <div
      className={`rounded-2xl border p-5 transition hover:shadow-sm ${statusClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="safe-text text-lg font-black">{item.facility.name}</p>

          <p className="mt-2 text-sm font-semibold opacity-80">{item.detail}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${badgeClass}`}
        >
          {item.label}
        </span>
      </div>
    </div>
  );
}

function UpcomingBookingCard({ booking }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="safe-text font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </p>

          <p className="safe-text mt-1 text-sm font-semibold text-slate-500">
            Customer: <b className="text-[#0B1F33]">{getCustomerName(booking)}</b>
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
            booking.status
          )}`}
        >
          {formatStatusLabel(booking.status)}
        </span>
      </div>
    </div>
  );
}

function PaymentReviewCard({ booking }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:shadow-sm">
      <p className="safe-text font-black text-[#0B1F33]">
        {getFacilityName(booking)}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-600">
        {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
        {formatTime(booking.end_time)}
      </p>

      <p className="safe-text mt-1 text-sm font-semibold text-slate-500">
        Customer: <b className="text-[#0B1F33]">{getCustomerName(booking)}</b>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(
            booking.payment_status
          )}`}
        >
          {formatStatusLabel(booking.payment_status)}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
          {money(booking.amount_paid)}
        </span>
      </div>
    </div>
  );
}

function MaintenanceCard({ block }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 transition hover:shadow-sm">
      <p className="safe-text font-black text-[#0B1F33]">
        {block.facilities?.name || "Facility"}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-600">
        {formatDate(block.maintenance_date)} • {formatTime(block.start_time)} -{" "}
        {formatTime(block.end_time)}
      </p>

      <p className="safe-text mt-1 text-sm font-black text-purple-700">
        {block.reason || "Facility maintenance"}
      </p>
    </div>
  );
}

function ActivityLogCard({ log }) {
  const action = log.action || log.action_type || "system_event";

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="safe-text font-black text-[#0B1F33]">
            {formatStatusLabel(action)}
          </p>

          <p className="safe-text mt-1 text-sm font-semibold text-slate-600">
            {log.description || "System activity recorded."}
          </p>

          <p className="safe-text mt-1 text-xs font-semibold text-slate-500">
            Actor: {log.profiles?.full_name || "System"}
          </p>
        </div>

        <p className="shrink-0 text-xs font-bold text-slate-500">
          {formatDateTime(log.created_at)}
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, description, icon, children }) {
  return (
    <div className="icb-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
          {icon}
        </span>

        <div>
          <h3 className="text-2xl font-black text-[#0B1F33]">{title}</h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Panel({ title, subtitle, icon, children }) {
  return (
    <div className="icb-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
          {icon}
        </span>

        <div>
          <h3 className="text-2xl font-black text-[#0B1F33]">{title}</h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}