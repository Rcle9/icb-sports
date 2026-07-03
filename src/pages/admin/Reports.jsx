import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  FileBarChart,
  RefreshCw,
  TrendingUp,
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

function getFirstDayOfMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
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
  return booking?.facilities?.name || "Facility";
}

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || "User";
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getPaidAmount(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  if (paymentStatus === "paid" || status === "approved") {
    return Number(booking.amount_paid || getBookingTotal(booking) || 0);
  }

  return 0;
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

function getDayKey(value) {
  if (!value) return "Unknown";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
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

function percentage(part, total) {
  if (!total) return "0%";

  return `${Math.round((Number(part || 0) / Number(total || 1)) * 100)}%`;
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "rejected") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "unpaid") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function completionStatusClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default function Reports() {
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getTodayDate());
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = booking.booking_date;
      const source = booking.is_walk_in ? "walk_in" : "online";
      const completionStatus = normalizeCompletionStatus(booking.completion_status);

      const matchesDate =
        (!dateFrom || bookingDate >= dateFrom) && (!dateTo || bookingDate <= dateTo);

      const matchesFacility =
        facilityFilter === "all" ||
        String(booking.facility_id) === String(facilityFilter);

      const matchesSource = sourceFilter === "all" || source === sourceFilter;

      const matchesCompletion =
        completionFilter === "all" || completionStatus === completionFilter;

      return matchesDate && matchesFacility && matchesSource && matchesCompletion;
    });
  }, [bookings, dateFrom, dateTo, facilityFilter, sourceFilter, completionFilter]);

  const paidBookings = useMemo(() => {
    return filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "paid" ||
        normalizeStatus(booking.status) === "approved"
    );
  }, [filteredBookings]);

  const summary = useMemo(() => {
    const totalRevenue = filteredBookings.reduce(
      (sum, booking) => sum + getPaidAmount(booking),
      0
    );

    const totalBookings = filteredBookings.length;

    const onlineBookings = filteredBookings.filter(
      (booking) => !booking.is_walk_in
    ).length;

    const walkInBookings = filteredBookings.filter(
      (booking) => booking.is_walk_in
    ).length;

    const completed = filteredBookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const noShow = filteredBookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "no_show"
    ).length;

    const cancelledLate = filteredBookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "cancelled_late"
    ).length;

    const finishedCount = completed + noShow + cancelledLate;

    const pendingPayments = filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "pending_verification"
    ).length;

    const paidCount = filteredBookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "paid"
    ).length;

    const totalHours = filteredBookings.reduce(
      (sum, booking) => sum + Number(booking.total_hours || 0),
      0
    );

    return {
      totalRevenue,
      totalBookings,
      onlineBookings,
      walkInBookings,
      completed,
      noShow,
      cancelledLate,
      finishedCount,
      pendingPayments,
      paidCount,
      totalHours,
      completionRate: percentage(completed, finishedCount),
      noShowRate: percentage(noShow, finishedCount),
    };
  }, [filteredBookings]);

  const revenueByMonth = useMemo(() => {
    return groupSum(
      paidBookings,
      (booking) => getMonthKey(booking.booking_date),
      (booking) => getPaidAmount(booking)
    );
  }, [paidBookings]);

  const revenueByDay = useMemo(() => {
    return groupSum(
      paidBookings,
      (booking) => getDayKey(booking.booking_date),
      (booking) => getPaidAmount(booking)
    );
  }, [paidBookings]);

  const bookingsByFacility = useMemo(() => {
    return groupCount(filteredBookings, (booking) => getFacilityName(booking))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredBookings]);

  const revenueByFacility = useMemo(() => {
    return groupSum(
      paidBookings,
      (booking) => getFacilityName(booking),
      (booking) => getPaidAmount(booking)
    )
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [paidBookings]);

  const completionSummary = useMemo(() => {
    return [
      { name: "Completed", value: summary.completed },
      { name: "No-show", value: summary.noShow },
      { name: "Cancelled Late", value: summary.cancelledLate },
      {
        name: "Not Completed",
        value: filteredBookings.filter(
          (booking) =>
            normalizeCompletionStatus(booking.completion_status) === "not_completed"
        ).length,
      },
    ];
  }, [filteredBookings, summary]);

  const sourceSummary = useMemo(() => {
    return [
      { name: "Online", value: summary.onlineBookings },
      { name: "Walk-in", value: summary.walkInBookings },
    ];
  }, [summary]);

  const statusSummary = useMemo(() => {
    return groupCount(filteredBookings, (booking) =>
      formatStatusLabel(booking.status)
    );
  }, [filteredBookings]);

  const paymentSummary = useMemo(() => {
    return groupCount(filteredBookings, (booking) =>
      formatStatusLabel(booking.payment_status)
    );
  }, [filteredBookings]);

  const facilityUtilization = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const facilityName = getFacilityName(booking);
      const hours = Number(booking.total_hours || 0);

      map.set(facilityName, Number(map.get(facilityName) || 0) + hours);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredBookings]);

  const recentBookings = useMemo(() => {
    return [...filteredBookings]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);
  }, [filteredBookings]);

  useEffect(() => {
    loadReports();

    const channel = supabase
      .channel(`admin-reports-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadReports(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadReports(showLoading = true) {
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

      setBookings(bookingData || []);
      setFacilities(facilityData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setDateFrom(getFirstDayOfMonth());
    setDateTo(getTodayDate());
    setFacilityFilter("all");
    setSourceFilter("all");
    setCompletionFilter("all");
  }

  function exportCSV() {
    const headers = [
      "Booking ID",
      "Source",
      "Customer",
      "Facility",
      "Date",
      "Start Time",
      "End Time",
      "Total Hours",
      "Rate Per Hour",
      "Total Amount",
      "Amount Paid",
      "Booking Status",
      "Payment Status",
      "Completion Status",
      "Payment Method",
      "Reference",
      "Receipt Number",
      "Created At",
      "Completed At",
      "Completion Notes",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.id,
      booking.is_walk_in ? "Walk-in" : "Online",
      getCustomerName(booking),
      getFacilityName(booking),
      booking.booking_date,
      cleanTime(booking.start_time),
      cleanTime(booking.end_time),
      booking.total_hours || 0,
      booking.rate_per_hour || 0,
      getBookingTotal(booking),
      booking.amount_paid || 0,
      formatStatusLabel(booking.status),
      formatStatusLabel(booking.payment_status),
      formatStatusLabel(booking.completion_status || "not_completed"),
      booking.payment_method || "",
      booking.payment_reference || "",
      booking.receipt_number || "",
      booking.created_at || "",
      booking.completed_at || "",
      booking.completion_notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `incredoball-reports-${dateFrom || "start"}-to-${
      dateTo || "end"
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Reports" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold">Premium Analytics</p>

                <h2 className="mt-2 text-3xl font-black">
                  Reports and Facility Performance
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Track revenue, booking completion, no-show rate, walk-in bookings, and facility usage.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Revenue" value={money(summary.totalRevenue)} />
                <HeroStat label="Bookings" value={summary.totalBookings} />
                <HeroStat label="Completed" value={summary.completed} />
                <HeroStat label="No-show" value={summary.noShow} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Report Filters
                </h3>

                <p className="text-sm text-slate-500">
                  Filter by date, facility, booking source, and completion status.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadReports()}
                  className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    Refresh
                  </span>
                </button>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Download size={16} />
                    Export CSV
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Date From
                </label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Date To
                </label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <FilterSelect
                label="Facility"
                value={facilityFilter}
                onChange={setFacilityFilter}
                options={[
                  { value: "all", label: "All Facilities" },
                  ...facilities.map((facility) => ({
                    value: facility.id,
                    label: facility.name,
                  })),
                ]}
              />

              <FilterSelect
                label="Source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "online", label: "Online" },
                  { value: "walk_in", label: "Walk-in" },
                ]}
              />

              <FilterSelect
                label="Completion"
                value={completionFilter}
                onChange={setCompletionFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "not_completed", label: "Not Completed" },
                  { value: "completed", label: "Completed" },
                  { value: "no_show", label: "No-show" },
                  { value: "cancelled_late", label: "Cancelled Late" },
                ]}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Loading reports...</p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Revenue"
                  value={money(summary.totalRevenue)}
                  description="Paid and approved bookings"
                  tone="green"
                />

                <MetricCard
                  title="Total Bookings"
                  value={summary.totalBookings}
                  description="All bookings in selected period"
                  tone="blue"
                />

                <MetricCard
                  title="Completion Rate"
                  value={summary.completionRate}
                  description={`${summary.completed} completed of ${summary.finishedCount} finished bookings`}
                  tone="green"
                />

                <MetricCard
                  title="No-show Rate"
                  value={summary.noShowRate}
                  description={`${summary.noShow} no-show bookings`}
                  tone="orange"
                />

                <MetricCard
                  title="Walk-in Bookings"
                  value={summary.walkInBookings}
                  description="Bookings created by staff"
                  tone="purple"
                />

                <MetricCard
                  title="Online Bookings"
                  value={summary.onlineBookings}
                  description="Bookings created by users"
                  tone="blue"
                />

                <MetricCard
                  title="Total Hours"
                  value={`${summary.totalHours} hr(s)`}
                  description="Total reserved facility hours"
                  tone="slate"
                />

                <MetricCard
                  title="Pending Payments"
                  value={summary.pendingPayments}
                  description="Payment proofs waiting for review"
                  tone="yellow"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard
                  title="Daily Revenue"
                  description="Revenue trend based on selected date range"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => money(value)} />
                      <Legend />
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
                  title="Monthly Revenue"
                  description="Revenue grouped by month"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => money(value)} />
                      <Legend />
                      <Bar dataKey="value" name="Revenue" fill="#C97B6C" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Revenue by Facility"
                  description="Top facilities based on revenue"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByFacility}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => money(value)} />
                      <Legend />
                      <Bar dataKey="value" name="Revenue" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Facility Utilization"
                  description="Total booked hours per facility"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={facilityUtilization}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Hours" fill="#2B2B2B" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Bookings by Facility"
                  description="Most booked facilities"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingsByFacility}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Bookings" fill="#2563EB" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Completion Summary"
                  description="Completed, no-show, cancelled late, and pending completion"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={completionSummary}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {completionSummary.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={
                              ["#16A34A", "#F97316", "#DC2626", "#94A3B8"][
                                index % 4
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Booking Source"
                  description="Online bookings compared with walk-in bookings"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceSummary}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {sourceSummary.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={["#C97B6C", "#7C3AED"][index % 2]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Payment Status Summary"
                  description="Payment distribution of bookings"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Bookings" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </section>

              <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Booking Status Summary
                  </h3>

                  <p className="text-sm text-slate-500">
                    Overview of booking statuses within the selected report range.
                  </p>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={statusSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Bookings" fill="#64748B" />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Recent Report Records
                    </h3>

                    <p className="text-sm text-slate-500">
                      Latest bookings included in the current report filters.
                    </p>
                  </div>

                  <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                    {filteredBookings.length} record(s)
                  </span>
                </div>

                {recentBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-sm text-slate-500">
                    No report records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                    <table className="w-full min-w-[1100px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Customer
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Facility
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Date / Time
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Source
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
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Completion
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="border border-[#DED8D2] px-4 py-3 font-bold text-[#2B2B2B]">
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

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-700">
                                {booking.is_walk_in ? "Walk-in" : "Online"}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-[#C97B6C]">
                              {money(getBookingTotal(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                                  booking.status
                                )}`}
                              >
                                {formatStatusLabel(booking.status)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(
                                  booking.payment_status
                                )}`}
                              >
                                {formatStatusLabel(booking.payment_status)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${completionStatusClass(
                                  booking.completion_status
                                )}`}
                              >
                                {formatStatusLabel(
                                  booking.completion_status || "not_completed"
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

function MetricCard({ title, value, description, tone }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div
        className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black uppercase ${toneClass}`}
      >
        {title}
      </div>

      <h3 className="mt-4 break-words text-3xl font-black text-[#2B2B2B]">
        {value}
      </h3>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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