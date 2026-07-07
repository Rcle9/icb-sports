// src/pages/staff/OperationsBoard.jsx

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  Clock,
  CreditCard,
  RefreshCw,
  UserPlus,
  Wrench,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatShortDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function isBookingEnded(booking) {
  if (!booking?.booking_date || !booking?.end_time) return false;

  const endDateTime = new Date(
    `${booking.booking_date}T${cleanTime(booking.end_time)}:00`
  );

  return endDateTime.getTime() <= Date.now();
}

function needsCompletionMarking(booking) {
  return (
    normalizeStatus(booking.status) === "approved" &&
    normalizePaymentStatus(booking.payment_status) === "paid" &&
    normalizeCompletionStatus(booking.completion_status) === "not_completed" &&
    isBookingEnded(booking)
  );
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "rejected") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function getPaymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "unpaid") return "bg-amber-100 text-amber-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function getCompletionStatusClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";
  if (value === "not_completed") return "bg-slate-100 text-slate-700";

  return "bg-slate-100 text-slate-700";
}

export default function OperationsBoard() {
  const { profile } = useAuth();

  const sidebarRole =
    String(profile?.role || "").toLowerCase() === "admin" ? "admin" : "staff";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [bookings, setBookings] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const dayBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === selectedDate);
  }, [bookings, selectedDate]);

  const approvedToday = useMemo(() => {
    return dayBookings
      .filter(
        (booking) =>
          normalizeStatus(booking.status) === "approved" &&
          normalizePaymentStatus(booking.payment_status) === "paid"
      )
      .sort((a, b) =>
        cleanTime(a.start_time).localeCompare(cleanTime(b.start_time))
      );
  }, [dayBookings]);

  const pendingPayments = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          normalizePaymentStatus(booking.payment_status) ===
          "pending_verification"
      )
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  }, [bookings]);

  const completionNeeded = useMemo(() => {
    return bookings
      .filter(needsCompletionMarking)
      .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));
  }, [bookings]);

  const walkInsToday = useMemo(() => {
    return dayBookings.filter((booking) => booking.is_walk_in);
  }, [dayBookings]);

  const activeMaintenance = useMemo(() => {
    return maintenanceBlocks.filter(
      (block) =>
        block.maintenance_date === selectedDate &&
        normalizeStatus(block.status) === "active"
    );
  }, [maintenanceBlocks, selectedDate]);

  const summary = useMemo(() => {
    const todayRevenue = dayBookings.reduce((sum, booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      if (status === "approved" || paymentStatus === "paid") {
        return sum + Number(booking.amount_paid || getBookingTotal(booking) || 0);
      }

      return sum;
    }, 0);

    return {
      totalToday: dayBookings.length,
      approvedToday: approvedToday.length,
      pendingPayments: pendingPayments.length,
      completionNeeded: completionNeeded.length,
      walkInsToday: walkInsToday.length,
      maintenanceToday: activeMaintenance.length,
      todayRevenue,
    };
  }, [
    dayBookings,
    approvedToday,
    pendingPayments,
    completionNeeded,
    walkInsToday,
    activeMaintenance,
  ]);

  useEffect(() => {
    loadBoard();

    const channel = supabase
      .channel(`operations-board-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadBookings(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_maintenance_blocks",
        },
        () => {
          loadMaintenanceBlocks(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadBoard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      await Promise.all([loadBookings(false), loadMaintenanceBlocks(false)]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load operations board.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
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
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: true });

      if (error) throw error;

      setBookings(data || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadMaintenanceBlocks(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("facility_maintenance_blocks")
        .select(`
          *,
          facilities (*)
        `)
        .order("maintenance_date", { ascending: true });

      if (error) throw error;

      setMaintenanceBlocks(data || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadBoard(false);
    } finally {
      setRefreshing(false);
    }
  }

  function openManageBookings(booking) {
    if (booking?.id) {
      window.location.href = `/staff/manage-bookings?highlight=${booking.id}`;
      return;
    }

    window.location.href = "/staff/manage-bookings";
  }

  function openWalkInBooking() {
    window.location.href = "/staff/walk-in-booking";
  }

  function openAvailabilityBoard() {
    window.location.href = "/staff/availability-board";
  }

  return (
    <div className="page-shell">
      <Sidebar
        role={sidebarRole}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Operations Board"
            subtitle="Monitor facility bookings, payments, walk-ins, and daily operations."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Daily Operations
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Staff Operations Board
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Monitor today’s approved facility bookings, pending payment
                  verification, maintenance blocks, walk-in sessions, and
                  completion tasks in one organized workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat
                  label="Today Revenue"
                  value={money(summary.todayRevenue)}
                />

                <HeroStat label="Today Bookings" value={summary.totalToday} />

                <HeroStat
                  label="Payment Review"
                  value={summary.pendingPayments}
                />

                <HeroStat
                  label="Completion Due"
                  value={summary.completionNeeded}
                />
              </div>
            </div>
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="icb-eyebrow">Operation Date</p>

                <h3 className="icb-section-title mt-2">
                  {formatDate(selectedDate)}
                </h3>

                <p className="icb-section-subtitle">
                  Choose the date you want to monitor and use the quick actions
                  to handle common staff tasks.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="icb-input w-auto min-w-[190px]"
                />

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="icb-btn-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={openWalkInBooking}
                  className="icb-btn-accent"
                >
                  <UserPlus size={17} />
                  Walk-in Booking
                </button>

                <button
                  type="button"
                  onClick={openAvailabilityBoard}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0B1F33] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C]"
                >
                  <CalendarDays size={17} />
                  Availability Board
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="icb-card p-8">
              <p className="text-sm font-semibold text-slate-500">
                Loading operations board...
              </p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard
                  icon={CalendarCheck}
                  label="Approved Today"
                  value={summary.approvedToday}
                  description="Paid sessions"
                  tone="green"
                />

                <MetricCard
                  icon={CreditCard}
                  label="Pending Payments"
                  value={summary.pendingPayments}
                  description="Needs review"
                  tone="blue"
                />

                <MetricCard
                  icon={CheckCircle}
                  label="Completion Due"
                  value={summary.completionNeeded}
                  description="Past sessions"
                  tone="orange"
                />

                <MetricCard
                  icon={UserPlus}
                  label="Walk-ins Today"
                  value={summary.walkInsToday}
                  description="Staff-created"
                  tone="purple"
                />

                <MetricCard
                  icon={Wrench}
                  label="Maintenance"
                  value={summary.maintenanceToday}
                  description="Active blocks"
                  tone="slate"
                />

                <MetricCard
                  icon={Clock}
                  label="Total Today"
                  value={summary.totalToday}
                  description="All records"
                  tone="coral"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <OperationsSection
                  title="Today’s Approved Bookings"
                  description="Paid and approved facility bookings scheduled for the selected date."
                  emptyText="No approved bookings for this date."
                  actionLabel="View all bookings"
                  onAction={() => openManageBookings()}
                >
                  {approvedToday.map((booking) => (
                    <BookingMiniCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => openManageBookings(booking)}
                    />
                  ))}
                </OperationsSection>

                <OperationsSection
                  title="Pending Payment Verification"
                  description="Payments waiting for staff review."
                  emptyText="No pending payment verifications."
                  actionLabel="Review payments"
                  onAction={() => openManageBookings()}
                >
                  {pendingPayments.map((booking) => (
                    <BookingMiniCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => openManageBookings(booking)}
                      highlight="payment"
                    />
                  ))}
                </OperationsSection>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <OperationsSection
                  title="Completion Marking Needed"
                  description="Past approved bookings that still need Completed, No-show, or Cancelled Late status."
                  emptyText="No bookings need completion marking."
                  actionLabel="Manage completion"
                  onAction={() => openManageBookings()}
                >
                  {completionNeeded.map((booking) => (
                    <BookingMiniCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => openManageBookings(booking)}
                      highlight="completion"
                    />
                  ))}
                </OperationsSection>

                <OperationsSection
                  title="Active Maintenance Today"
                  description="Facility maintenance blocks for the selected date."
                  emptyText="No active maintenance blocks today."
                  actionLabel="Availability board"
                  onAction={openAvailabilityBoard}
                >
                  {activeMaintenance.map((block) => (
                    <MaintenanceMiniCard key={block.id} block={block} />
                  ))}
                </OperationsSection>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <OperationsSection
                  title="Walk-in Bookings Today"
                  description="Bookings created directly by staff."
                  emptyText="No walk-in bookings today."
                  actionLabel="Create walk-in"
                  onAction={openWalkInBooking}
                >
                  {walkInsToday.map((booking) => (
                    <BookingMiniCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => openManageBookings(booking)}
                      highlight="walkin"
                    />
                  ))}
                </OperationsSection>

                <OperationsSection
                  title="All Bookings Today"
                  description="Complete list of facility bookings for the selected date."
                  emptyText="No bookings for this date."
                  actionLabel="Open booking list"
                  onAction={() => openManageBookings()}
                >
                  {dayBookings.map((booking) => (
                    <BookingMiniCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => openManageBookings(booking)}
                    />
                  ))}
                </OperationsSection>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, description, tone }) {
  const toneClass = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
    coral: "bg-[#F3E4DF] text-[#B86658]",
  }[tone];

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className={`inline-flex rounded-2xl p-3 ${toneClass}`}>
        <Icon size={22} />
      </div>

      <h3 className="mt-4 text-3xl font-black text-[#0B1F33]">{value}</h3>

      <p className="mt-1 text-sm font-black text-[#0B1F33]">{label}</p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {description}
      </p>
    </div>
  );
}

function OperationsSection({
  title,
  description,
  emptyText,
  children,
  actionLabel,
  onAction,
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasChildren = childArray.some(Boolean);

  return (
    <section className="icb-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="icb-eyebrow">Operations</p>

          <h3 className="icb-section-title mt-2">{title}</h3>

          <p className="icb-section-subtitle">{description}</p>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="icb-btn-light w-full md:w-auto"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {!hasChildren ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {children}
        </div>
      )}
    </section>
  );
}

function BookingMiniCard({ booking, onClick, highlight }) {
  const highlightClass = {
    payment: "border-blue-200 bg-blue-50",
    completion: "border-orange-200 bg-orange-50",
    walkin: "border-purple-200 bg-purple-50",
  }[highlight];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:border-[#C97B6C]/40 hover:shadow-sm ${
        highlightClass || "border-[#DED8D2] bg-white hover:bg-[#FBFAF9]"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h4 className="safe-text text-lg font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Clock size={15} />
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            Customer:{" "}
            <span className="font-black text-[#0B1F33]">
              {getCustomerName(booking)}
            </span>
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Created: {formatDateTime(booking.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <StatusBadge
            label={formatStatusLabel(booking.status)}
            className={getStatusClass(booking.status)}
          />

          <StatusBadge
            label={formatStatusLabel(booking.payment_status)}
            className={getPaymentStatusClass(booking.payment_status)}
          />

          {booking.is_walk_in && (
            <StatusBadge label="Walk-in" className="bg-purple-100 text-purple-700" />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniDetail label="Total" value={money(getBookingTotal(booking))} />

        <MiniDetail label="Paid" value={money(booking.amount_paid || 0)} />

        <MiniDetail
          label="Completion"
          value={formatStatusLabel(booking.completion_status || "not_completed")}
          badgeClass={getCompletionStatusClass(
            booking.completion_status || "not_completed"
          )}
        />
      </div>
    </button>
  );
}

function MaintenanceMiniCard({ block }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h4 className="safe-text text-lg font-black text-[#0B1F33]">
            {block.facilities?.name || "Facility"}
          </h4>

          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <Clock size={15} />
            {formatTime(block.start_time)} - {formatTime(block.end_time)}
          </p>

          <p className="safe-text mt-1 text-sm font-bold text-purple-700">
            {block.reason || "Facility maintenance"}
          </p>
        </div>

        <StatusBadge
          label={formatStatusLabel(block.status)}
          className="bg-purple-100 text-purple-700"
        />
      </div>
    </div>
  );
}

function MiniDetail({ label, value, badgeClass }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white/70 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${badgeClass}`}
        >
          {value || "-"}
        </span>
      ) : (
        <p className="safe-text mt-1 text-sm font-black text-[#0B1F33]">
          {value || "-"}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ label, className }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {label}
    </span>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}