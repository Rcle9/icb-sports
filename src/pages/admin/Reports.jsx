// src/pages/admin/Reports.jsx

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
  CalendarDays,
  Download,
  FileBarChart,
  Printer,
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

function getBalanceAmount(booking) {
  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getBookingTotal(booking) - getPaidAmount(booking), 0);
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
  if (value === "completed") return "bg-purple-100 text-purple-700";

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
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = booking.booking_date;
      const source = booking.is_walk_in ? "walk_in" : "online";
      const paymentStatus = normalizePaymentStatus(booking.payment_status);
      const completionStatus = normalizeCompletionStatus(booking.completion_status);

      const matchesDate =
        (!dateFrom || bookingDate >= dateFrom) && (!dateTo || bookingDate <= dateTo);

      const matchesFacility =
        facilityFilter === "all" ||
        String(booking.facility_id) === String(facilityFilter);

      const matchesSource = sourceFilter === "all" || source === sourceFilter;

      const matchesPayment =
        paymentFilter === "all" || paymentStatus === paymentFilter;

      const matchesCompletion =
        completionFilter === "all" || completionStatus === completionFilter;

      return (
        matchesDate &&
        matchesFacility &&
        matchesSource &&
        matchesPayment &&
        matchesCompletion
      );
    });
  }, [
    bookings,
    dateFrom,
    dateTo,
    facilityFilter,
    sourceFilter,
    paymentFilter,
    completionFilter,
  ]);

  const paidBookings = useMemo(() => {
    return filteredBookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "paid"
    );
  }, [filteredBookings]);

  const summary = useMemo(() => {
    const expectedRevenue = filteredBookings.reduce(
      (sum, booking) => sum + getBookingTotal(booking),
      0
    );

    const paidRevenue = filteredBookings.reduce(
      (sum, booking) => sum + getPaidAmount(booking),
      0
    );

    const unpaidBalance = filteredBookings.reduce(
      (sum, booking) => sum + getBalanceAmount(booking),
      0
    );

    const totalBookings = filteredBookings.length;

    const approved = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    ).length;

    const reserved = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "reserved"
    ).length;

    const cancelled = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "cancelled"
    ).length;

    const expired = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "expired"
    ).length;

    const onlineBookings = filteredBookings.filter(
      (booking) => !booking.is_walk_in
    ).length;

    const walkInBookings = filteredBookings.filter(
      (booking) => booking.is_walk_in
    ).length;

    const completed = filteredBookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const noShow = filteredBookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "no_show"
    ).length;

    const cancelledLate = filteredBookings.filter(
      (booking) =>
        normalizeCompletionStatus(booking.completion_status) === "cancelled_late"
    ).length;

    const finishedCount = completed + noShow + cancelledLate;

    const paidCount = filteredBookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "paid"
    ).length;

    const unpaidCount = filteredBookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "unpaid"
    ).length;

    const pendingPayments = filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "pending_verification"
    ).length;

    const rejectedPayments = filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "rejected_payment"
    ).length;

    const totalHours = filteredBookings.reduce(
      (sum, booking) => sum + Number(booking.total_hours || 0),
      0
    );

    return {
      expectedRevenue,
      paidRevenue,
      unpaidBalance,
      totalBookings,
      approved,
      reserved,
      cancelled,
      expired,
      onlineBookings,
      walkInBookings,
      completed,
      noShow,
      cancelledLate,
      finishedCount,
      paidCount,
      unpaidCount,
      pendingPayments,
      rejectedPayments,
      totalHours,
      completionRate: percentage(completed, finishedCount),
      noShowRate: percentage(noShow, finishedCount),
      paidRate: percentage(paidCount, totalBookings),
    };
  }, [filteredBookings]);

  const revenueByDay = useMemo(() => {
    return groupSum(
      paidBookings,
      (booking) => getDayKey(booking.booking_date),
      (booking) => getPaidAmount(booking)
    );
  }, [paidBookings]);

  const revenueByMonth = useMemo(() => {
    return groupSum(
      paidBookings,
      (booking) => getMonthKey(booking.booking_date),
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

  const facilityHours = useMemo(() => {
    return groupSum(
      filteredBookings,
      (booking) => getFacilityName(booking),
      (booking) => Number(booking.total_hours || 0)
    )
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredBookings]);

  const mostBookedFacility = useMemo(() => {
    return bookingsByFacility[0] || { name: "-", value: 0 };
  }, [bookingsByFacility]);

  const leastBookedFacility = useMemo(() => {
    if (bookingsByFacility.length === 0) return { name: "-", value: 0 };

    return bookingsByFacility[bookingsByFacility.length - 1];
  }, [bookingsByFacility]);

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

  const recentBookings = useMemo(() => {
    return [...filteredBookings]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 12);
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
            email,
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
    setPaymentFilter("all");
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
      "Balance",
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
      getPaidAmount(booking),
      getBalanceAmount(booking),
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
    link.download = `incredoball-report-${dateFrom || "start"}-to-${
      dateTo || "end"
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Reports" subtitle="Revenue, bookings, and facility analytics" />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Admin Analytics
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Reports and facility performance.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  Track bookings, revenue, payment status, facility usage,
                  online bookings, walk-in bookings, completion, and no-show
                  records.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Paid Revenue" value={money(summary.paidRevenue)} />
                <HeroStat label="Expected" value={money(summary.expectedRevenue)} />
                <HeroStat label="Bookings" value={summary.totalBookings} />
                <HeroStat label="Paid Rate" value={summary.paidRate} />
              </div>
            </div>
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="icb-eyebrow">Report Filters</p>

                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Generate report
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Filter report results by date, facility, source, payment, and
                  completion status.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadReports()}
                  className="icb-btn-light"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                <button type="button" onClick={printReport} className="icb-btn-light">
                  <Printer size={16} />
                  Print
                </button>

                <button type="button" onClick={exportCSV} className="icb-btn-accent">
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="icb-label">Date From</label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="icb-input"
                />
              </div>

              <div>
                <label className="icb-label">Date To</label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="icb-input"
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
                label="Payment"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "pending_verification", label: "Pending Verification" },
                  { value: "paid", label: "Paid" },
                  { value: "rejected_payment", label: "Rejected Payment" },
                  { value: "expired", label: "Expired" },
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
                <button type="button" onClick={resetFilters} className="icb-btn-light w-full">
                  Reset
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="icb-card p-6">
              <p className="text-sm font-semibold text-slate-500">
                Loading reports...
              </p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Paid Revenue"
                  value={money(summary.paidRevenue)}
                  description="Total verified paid amount"
                  tone="green"
                  icon={<TrendingUp size={20} />}
                />

                <MetricCard
                  title="Expected Revenue"
                  value={money(summary.expectedRevenue)}
                  description="Total booking amount before balance"
                  tone="blue"
                  icon={<FileBarChart size={20} />}
                />

                <MetricCard
                  title="Unpaid Balance"
                  value={money(summary.unpaidBalance)}
                  description="Remaining balance from bookings"
                  tone="orange"
                  icon={<FileBarChart size={20} />}
                />

                <MetricCard
                  title="Total Bookings"
                  value={summary.totalBookings}
                  description="All bookings in selected period"
                  tone="slate"
                  icon={<CalendarDays size={20} />}
                />

                <MetricCard
                  title="Approved"
                  value={summary.approved}
                  description="Approved booking records"
                  tone="green"
                />

                <MetricCard
                  title="Reserved"
                  value={summary.reserved}
                  description="Reserved slots awaiting payment or review"
                  tone="blue"
                />

                <MetricCard
                  title="Cancelled"
                  value={summary.cancelled}
                  description="Cancelled booking records"
                  tone="red"
                />

                <MetricCard
                  title="Expired"
                  value={summary.expired}
                  description="Expired unpaid reservations"
                  tone="orange"
                />

                <MetricCard
                  title="Paid"
                  value={summary.paidCount}
                  description="Paid and verified bookings"
                  tone="green"
                />

                <MetricCard
                  title="Pending Payment"
                  value={summary.pendingPayments}
                  description="Payment proofs waiting for review"
                  tone="yellow"
                />

                <MetricCard
                  title="Rejected Payment"
                  value={summary.rejectedPayments}
                  description="Rejected payment proof uploads"
                  tone="red"
                />

                <MetricCard
                  title="Unpaid"
                  value={summary.unpaidCount}
                  description="Bookings without verified payment"
                  tone="orange"
                />

                <MetricCard
                  title="Completed"
                  value={summary.completed}
                  description={`Completion rate: ${summary.completionRate}`}
                  tone="green"
                />

                <MetricCard
                  title="No-show"
                  value={summary.noShow}
                  description={`No-show rate: ${summary.noShowRate}`}
                  tone="orange"
                />

                <MetricCard
                  title="Walk-in"
                  value={summary.walkInBookings}
                  description="Bookings created by staff"
                  tone="purple"
                />

                <MetricCard
                  title="Online"
                  value={summary.onlineBookings}
                  description="Bookings created by users"
                  tone="blue"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <HighlightCard
                  title="Most Booked Facility"
                  value={mostBookedFacility.name}
                  description={`${mostBookedFacility.value} booking(s)`}
                />

                <HighlightCard
                  title="Least Booked Facility"
                  value={leastBookedFacility.name}
                  description={`${leastBookedFacility.value} booking(s)`}
                />

                <HighlightCard
                  title="Total Reserved Hours"
                  value={`${summary.totalHours} hr(s)`}
                  description="Total hours booked in selected period"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard
                  title="Daily Revenue"
                  description="Paid revenue by booking date"
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
                  description="Paid revenue grouped by month"
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
                  description="Top facilities based on paid revenue"
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
                  title="Facility Hours"
                  description="Total reserved hours per facility"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={facilityHours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Hours" fill="#0B1F33" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Bookings by Facility"
                  description="Most used facilities based on booking count"
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
                  title="Payment Status"
                  description="Paid, unpaid, pending, and rejected payments"
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

                <ChartCard
                  title="Booking Completion"
                  description="Completed, no-show, cancelled late, and not completed"
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
              </section>

              <section className="icb-card mb-6 p-5 sm:p-6">
                <div className="mb-5">
                  <p className="icb-eyebrow">Booking Status</p>

                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Booking status summary
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Overview of booking statuses within the selected report
                    range.
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

              <section className="icb-card p-5 sm:p-6">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="icb-eyebrow">Report Records</p>

                    <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                      Recent records
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Latest bookings included in the current report filters.
                    </p>
                  </div>

                  <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#C97B6C]">
                    {filteredBookings.length} record(s)
                  </span>
                </div>

                {recentBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-sm font-semibold text-slate-500">
                    No report records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                    <table className="w-full min-w-[1180px] border-collapse text-sm">
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
                            Total
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Paid
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3 text-left">
                            Balance
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

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-700">
                                {booking.is_walk_in ? "Walk-in" : "Online"}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-[#C97B6C]">
                              {money(getBookingTotal(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-green-700">
                              {money(getPaidAmount(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-orange-700">
                              {money(getBalanceAmount(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <Badge className={statusClass(booking.status)}>
                                {formatStatusLabel(booking.status)}
                              </Badge>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <Badge
                                className={paymentStatusClass(
                                  booking.payment_status
                                )}
                              >
                                {formatStatusLabel(booking.payment_status)}
                              </Badge>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <Badge
                                className={completionStatusClass(
                                  booking.completion_status
                                )}
                              >
                                {formatStatusLabel(
                                  booking.completion_status || "not_completed"
                                )}
                              </Badge>
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

function MetricCard({ title, value, description, tone = "slate", icon }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="icb-card icb-card-hover p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black uppercase ${toneClass}`}
        >
          {title}
        </span>

        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
            {icon}
          </div>
        )}
      </div>

      <h3 className="mt-4 break-words text-3xl font-black text-[#0B1F33]">
        {value}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function HighlightCard({ title, value, description }) {
  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-[#0B1F33] p-6 text-white shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
        {title}
      </p>

      <h3 className="mt-3 break-words text-2xl font-black">{value}</h3>

      <p className="mt-2 text-sm font-semibold text-white/75">{description}</p>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="icb-card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-2xl font-black text-[#0B1F33]">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="icb-select"
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
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <h3 className="mt-1 text-lg font-black sm:text-xl">{value}</h3>
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