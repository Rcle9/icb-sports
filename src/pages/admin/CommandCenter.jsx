import { useEffect, useMemo, useState } from "react";
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
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "rejected") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

export default function CommandCenter() {
  const today = getTodayDate();

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === today);
  }, [bookings, today]);

  const todayRevenue = useMemo(() => {
    return todayBookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
  }, [todayBookings]);

  const pendingPayments = useMemo(() => {
    return bookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "pending_verification"
    );
  }, [bookings]);

  const activeMaintenanceToday = useMemo(() => {
    return maintenanceBlocks.filter(
      (block) => block.maintenance_date === today && normalizeStatus(block.status) === "active"
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

        if (normalizeStatus(currentBooking.status) === "approved" || paymentStatus === "paid") {
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

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Command Center" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold">Premium Admin Dashboard</p>

                <h2 className="mt-2 text-3xl font-black">
                  InCredoBall Command Center
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Monitor live bookings, revenue, facility availability, payments, and maintenance.
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
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Loading command center...</p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Revenue"
                  value={money(bookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0))}
                  description="All paid and approved bookings"
                  tone="green"
                />

                <MetricCard
                  title="Total Bookings"
                  value={bookings.length}
                  description="Online and walk-in bookings"
                  tone="blue"
                />

                <MetricCard
                  title="Pending Payments"
                  value={pendingPayments.length}
                  description="Needs staff verification"
                  tone="yellow"
                />

                <MetricCard
                  title="Active Maintenance"
                  value={maintenanceBlocks.length}
                  description="Current facility blocks"
                  tone="purple"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Live Facility Availability
                    </h3>

                    <p className="text-sm text-slate-500">
                      Current status of all facilities today.
                    </p>
                  </div>

                  {facilityAvailability.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                      No facilities found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {facilityAvailability.map((item) => (
                        <FacilityStatusCard key={item.facility.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Upcoming Today
                    </h3>

                    <p className="text-sm text-slate-500">
                      Next active bookings for today.
                    </p>
                  </div>

                  {upcomingToday.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                      No upcoming bookings today.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingToday.map((booking) => (
                        <UpcomingBookingCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard
                  title="Monthly Revenue"
                  description="Revenue trend from paid bookings"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => money(value)} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Revenue"
                        stroke="#C97B6C"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Booking Source"
                  description="Online bookings compared with walk-in bookings"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingSourceSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#C97B6C" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Booking Status Summary"
                  description="Overall booking status distribution"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#2B2B2B" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Top Facilities"
                  description="Most booked facilities"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topFacilities}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Panel title="Pending Payment Verifications" subtitle="Bookings waiting for staff review">
                  {pendingPayments.length === 0 ? (
                    <EmptyState text="No pending payment verifications." />
                  ) : (
                    <div className="space-y-3">
                      {pendingPayments.slice(0, 6).map((booking) => (
                        <PaymentReviewCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Active Maintenance Blocks" subtitle="Facilities currently blocked for maintenance">
                  {maintenanceBlocks.length === 0 ? (
                    <EmptyState text="No active maintenance blocks." />
                  ) : (
                    <div className="space-y-3">
                      {maintenanceBlocks.slice(0, 6).map((block) => (
                        <MaintenanceCard key={block.id} block={block} />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Recent Activity
                  </h3>

                  <p className="text-sm text-slate-500">
                    Latest system actions and audit trail updates.
                  </p>
                </div>

                {activityLogs.length === 0 ? (
                  <EmptyState text="No recent activity logs." />
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <ActivityLogCard key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-xl font-black">{value}</h3>
    </div>
  );
}

function MetricCard({ title, value, description, tone }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
  }[tone];

  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black uppercase ${toneClass}`}>
        {title}
      </div>

      <h3 className="mt-4 break-words text-3xl font-black text-[#2B2B2B]">
        {value}
      </h3>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function FacilityStatusCard({ item }) {
  const statusClass = {
    available: "border-green-500 bg-green-50 text-green-700",
    occupied: "border-slate-500 bg-slate-100 text-slate-700",
    reserved: "border-yellow-500 bg-yellow-50 text-yellow-700",
    maintenance: "border-purple-500 bg-purple-50 text-purple-700",
  }[item.status];

  return (
    <div className={`rounded-2xl border p-5 ${statusClass}`}>
      <p className="text-lg font-black">{item.facility.name}</p>
      <p className="mt-2 text-sm font-black">{item.label}</p>
      <p className="mt-1 text-sm font-semibold opacity-80">{item.detail}</p>
    </div>
  );
}

function UpcomingBookingCard({ booking }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#2B2B2B]">{getFacilityName(booking)}</p>

          <p className="mt-1 text-sm text-slate-600">
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Customer: <b>{getCustomerName(booking)}</b>
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(booking.status)}`}>
          {formatStatusLabel(booking.status)}
        </span>
      </div>
    </div>
  );
}

function PaymentReviewCard({ booking }) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
      <p className="font-black text-[#2B2B2B]">{getFacilityName(booking)}</p>

      <p className="mt-1 text-sm text-slate-600">
        {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
        {formatTime(booking.end_time)}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Customer: <b>{getCustomerName(booking)}</b>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(booking.payment_status)}`}>
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
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
      <p className="font-black text-[#2B2B2B]">
        {block.facilities?.name || "Facility"}
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {formatDate(block.maintenance_date)} • {formatTime(block.start_time)} -{" "}
        {formatTime(block.end_time)}
      </p>

      <p className="mt-1 text-sm font-semibold text-purple-700">
        {block.reason || "Facility maintenance"}
      </p>
    </div>
  );
}

function ActivityLogCard({ log }) {
  const action = log.action || log.action_type || "system_event";

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-black text-[#2B2B2B]">
            {formatStatusLabel(action)}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {log.description || "System activity recorded."}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Actor: {log.profiles?.full_name || "System"}
          </p>
        </div>

        <p className="text-xs font-bold text-slate-500">
          {formatDateTime(log.created_at)}
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-2xl font-black text-[#2B2B2B]">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-2xl font-black text-[#2B2B2B]">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
      {text}
    </div>
  );
}