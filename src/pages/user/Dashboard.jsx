import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ReceiptText,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
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
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function getStatusBadge(status) {
  const value = normalizeStatus(status);

  if (value === "approved" || value === "completed") {
    return "icb-badge icb-badge-success";
  }

  if (value === "reserved" || value === "pending") {
    return "icb-badge icb-badge-warning";
  }

  if (value === "cancelled" || value === "rejected") {
    return "icb-badge icb-badge-danger";
  }

  return "icb-badge icb-badge-muted";
}

function getPaymentBadge(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid" || value === "verified") {
    return "icb-badge icb-badge-success";
  }

  if (value === "pending_verification") {
    return "icb-badge icb-badge-info";
  }

  if (value === "rejected_payment") {
    return "icb-badge icb-badge-danger";
  }

  return "icb-badge icb-badge-muted";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function UserDashboard() {
  const { user, profile } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || "Member";

  const stats = useMemo(() => {
    const today = getTodayDate();

    const pending = bookings.filter((booking) =>
      ["pending", "reserved"].includes(normalizeStatus(booking.status))
    ).length;

    const approved = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    ).length;

    const completed = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "completed"
    ).length;

    const todayBookings = bookings.filter(
      (booking) => booking.booking_date === today
    ).length;

    const totalAmount = bookings.reduce((sum, booking) => {
      return sum + Number(booking.total_amount || booking.amount_paid || 0);
    }, 0);

    return {
      pending,
      approved,
      completed,
      todayBookings,
      totalAmount,
    };
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const today = getTodayDate();

    return bookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);

        return (
          booking.booking_date >= today &&
          !["cancelled", "rejected", "completed"].includes(status)
        );
      })
      .slice(0, 5);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return bookings.slice(0, 5);
  }, [bookings]);

  useEffect(() => {
    if (!user?.id) return;

    loadDashboard();

    const channel = supabase
      .channel(`user-dashboard-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadDashboard(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadDashboard(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      if (!user?.id) return;

      const [bookingsRes, notificationsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `
            *,
            facilities (*)
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (notificationsRes.error) throw notificationsRes.error;

      setBookings(bookingsRes.data || []);
      setNotifications(notificationsRes.data || []);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Dashboard" subtitle="Customer Portal" />

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <section className="page-hero icb-fade-up mb-6 overflow-hidden">
            <div className="relative">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#C97B6C]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

              <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.8fr] xl:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#E8A093]">
                    InCredoBall Member Portal
                  </p>

                  <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    {getGreeting()}, {displayName}.
                  </h2>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">
                    Book your sports facility, track your reservations, check payment
                    updates, and stay notified in one clean dashboard.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/booking" className="icb-btn-accent">
                      <CalendarDays size={18} />
                      Book Facility
                    </Link>

                    <Link
                      to="/my-bookings"
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                    >
                      <ReceiptText size={18} />
                      My Bookings
                    </Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E8A093]">
                    Total Booking Value
                  </p>

                  <h3 className="mt-3 text-3xl font-black text-white">
                    {loading ? "..." : money(stats.totalAmount)}
                  </h3>

                  <p className="mt-2 text-sm text-white/70">
                    Overall amount from your facility reservations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Pending / Reserved"
              value={loading ? "..." : stats.pending}
              sub="Waiting for confirmation or payment"
              icon={Clock}
              tone="warning"
            />

            <StatCard
              title="Approved Bookings"
              value={loading ? "..." : stats.approved}
              sub="Confirmed facility sessions"
              icon={CheckCircle2}
              tone="success"
            />

            <StatCard
              title="Today's Bookings"
              value={loading ? "..." : stats.todayBookings}
              sub="Scheduled for today"
              icon={CalendarCheck}
              tone="info"
            />

            <StatCard
              title="Completed"
              value={loading ? "..." : stats.completed}
              sub="Finished facility sessions"
              icon={Trophy}
              tone="accent"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardCard
              title="Upcoming Bookings"
              description="Your nearest active facility reservations."
              actionLabel="View all"
              actionTo="/my-bookings"
            >
              {loading ? (
                <LoadingState text="Loading upcoming bookings..." />
              ) : upcomingBookings.length === 0 ? (
                <EmptyState
                  title="No upcoming bookings"
                  description="Start by booking an available facility schedule."
                  actionTo="/booking"
                  actionLabel="Book Facility"
                />
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard
              title="Recent Notifications"
              description="Latest updates from your account."
              actionLabel="Open"
              actionTo="/user/notifications"
            >
              {loading ? (
                <LoadingState text="Loading notifications..." />
              ) : notifications.length === 0 ? (
                <EmptyState
                  title="No notifications yet"
                  description="Your booking updates will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <NotificationItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </DashboardCard>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <DashboardCard title="Quick Actions" description="Common things you can do.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickAction
                  to="/booking"
                  title="Book a Facility"
                  description="Choose sport, court/table, date, and time slot."
                  icon={CalendarDays}
                />

                <QuickAction
                  to="/my-bookings"
                  title="Track My Bookings"
                  description="Review booking status and payment updates."
                  icon={ReceiptText}
                />

                <QuickAction
                  to="/booking-timeline"
                  title="Booking Timeline"
                  description="See your booking activity history."
                  icon={Clock}
                />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Recent Booking Activity"
              description="Latest facility bookings from your account."
              actionLabel="View details"
              actionTo="/my-bookings"
            >
              {loading ? (
                <LoadingState text="Loading recent bookings..." />
              ) : recentBookings.length === 0 ? (
                <EmptyState
                  title="No booking activity yet"
                  description="Your submitted facility bookings will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} compact />
                  ))}
                </div>
              )}
            </DashboardCard>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, tone = "accent" }) {
  const tones = {
    accent: {
      box: "bg-[#F3E4DF] text-[#B86658]",
      dot: "bg-[#C97B6C]",
    },
    success: {
      box: "bg-green-50 text-green-700",
      dot: "bg-green-500",
    },
    warning: {
      box: "bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    },
    info: {
      box: "bg-blue-50 text-blue-700",
      dot: "bg-blue-500",
    },
  };

  const selected = tones[tone] || tones.accent;

  return (
    <div className="icb-card icb-fade-up p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(11,31,51,0.09)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-black text-[#0B1F33]">{value}</h3>

          <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
            {sub}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected.box}`}
        >
          <Icon size={22} />
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-2/3 rounded-full ${selected.dot}`} />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  actionLabel,
  actionTo,
  children,
}) {
  return (
    <section className="icb-card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
            {title}
          </p>

          <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>

        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="hidden shrink-0 items-center gap-1 rounded-2xl border border-[#DED8D2] bg-white px-4 py-2 text-xs font-black text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658] sm:inline-flex"
          >
            {actionLabel}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}

function BookingCard({ booking, compact = false }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/50 hover:shadow-[0_10px_26px_rgba(11,31,51,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-base font-black text-[#0B1F33]">
            {booking.facilities?.name || "Facility Booking"}
          </h4>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          {!compact && (
            <p className="mt-2 text-sm font-black text-[#C97B6C]">
              {money(booking.total_amount || booking.amount_paid || 0)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className={getStatusBadge(status)}>{status}</span>
          <span className={getPaymentBadge(paymentStatus)}>
            {paymentStatus.replaceAll("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

function NotificationItem({ item }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
          <Bell size={18} />
        </div>

        <div className="min-w-0">
          <h4 className="font-black text-[#0B1F33]">{item.title}</h4>

          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
            {item.message}
          </p>

          <p className="mt-2 text-xs font-bold text-slate-400">
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, title, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/60 hover:bg-[#FBFAF9]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B1F33] text-white transition group-hover:bg-[#C97B6C]">
        <Icon size={21} />
      </div>

      <div className="min-w-0">
        <h4 className="font-black text-[#0B1F33]">{title}</h4>

        <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

function LoadingState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function EmptyState({ title, description, actionTo, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6">
      <h4 className="font-black text-[#0B1F33]">{title}</h4>

      <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
        {description}
      </p>

      {actionTo && actionLabel && (
        <Link to={actionTo} className="icb-btn-accent mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}