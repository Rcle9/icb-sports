import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
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

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = String(time).slice(0, 5).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function getPaymentClass(paymentStatus) {
  const value = normalizePaymentStatus(paymentStatus);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function getStatusMessage(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (status === "approved") {
    return "Approved and ready for your scheduled session.";
  }

  if (status === "reserved" && paymentStatus === "unpaid") {
    return "Reserved. Upload your payment proof to continue.";
  }

  if (paymentStatus === "pending_verification") {
    return "Payment proof submitted and waiting for staff verification.";
  }

  if (paymentStatus === "rejected_payment") {
    return "Payment proof was rejected. Please upload a valid proof.";
  }

  if (status === "pending") {
    return "Waiting for staff approval.";
  }

  if (status === "rejected") {
    return "This request was rejected. Please check the reason in My Bookings.";
  }

  if (status === "cancelled") {
    return "This booking request was cancelled.";
  }

  if (status === "expired") {
    return "This reservation expired because payment was not completed on time.";
  }

  if (status === "completed") {
    return "This booking session has been completed.";
  }

  return "Booking status is being updated.";
}

function getBookingAmount(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computedTotal;
}

function isUpcomingBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const today = getTodayDate();

  return status === "approved" && String(booking?.booking_date || "") >= today;
}

export default function UserDashboard() {
  const [stats, setStats] = useState({
    reservedBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    upcomingApproved: 0,
    rejectedCancelled: 0,
    totalBookings: 0,
    notifications: 0,
    unreadNotifications: 0,
    approvedAmount: 0,
  });

  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`user-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => loadDashboard(false)
      )
      .subscribe();

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [bookingsRes, notificationsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, facilities (*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (notificationsRes.error) throw notificationsRes.error;

      const userBookings = bookingsRes.data || [];
      const userNotifications = notificationsRes.data || [];

      const approvedBookings = userBookings.filter(
        (booking) => normalizeStatus(booking.status) === "approved"
      );

      const upcomingApproved = approvedBookings.filter(isUpcomingBooking);

      const approvedAmount = approvedBookings.reduce((sum, booking) => {
        return sum + getBookingAmount(booking);
      }, 0);

      setStats({
        reservedBookings: userBookings.filter(
          (booking) => normalizeStatus(booking.status) === "reserved"
        ).length,
        pendingBookings: userBookings.filter(
          (booking) => normalizeStatus(booking.status) === "pending"
        ).length,
        approvedBookings: approvedBookings.length,
        upcomingApproved: upcomingApproved.length,
        rejectedCancelled: userBookings.filter((booking) =>
          ["rejected", "cancelled", "expired"].includes(
            normalizeStatus(booking.status)
          )
        ).length,
        totalBookings: userBookings.length,
        notifications: userNotifications.length,
        unreadNotifications: userNotifications.filter((item) => !item.is_read)
          .length,
        approvedAmount,
      });

      setBookings(userBookings);
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Dashboard error:", error.message);
      setError(error.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard(false);
  }

  const nextBooking = useMemo(() => {
    return bookings
      .filter(isUpcomingBooking)
      .sort((a, b) => {
        const dateA = `${a.booking_date || ""} ${a.start_time || ""}`;
        const dateB = `${b.booking_date || ""} ${b.start_time || ""}`;

        return dateA.localeCompare(dateB);
      })[0];
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(isUpcomingBooking)
      .sort((a, b) => {
        const dateA = `${a.booking_date || ""} ${a.start_time || ""}`;
        const dateB = `${b.booking_date || ""} ${b.start_time || ""}`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 4);
  }, [bookings]);

  const paymentActionBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);
        const paymentStatus = normalizePaymentStatus(booking.payment_status);

        return (
          ["reserved", "pending"].includes(status) &&
          ["unpaid", "rejected_payment"].includes(paymentStatus)
        );
      })
      .slice(0, 4);
  }, [bookings]);

  const pendingBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);
        const paymentStatus = normalizePaymentStatus(booking.payment_status);

        return (
          status === "pending" ||
          paymentStatus === "pending_verification"
        );
      })
      .slice(0, 4);
  }, [bookings]);

  const statusAlerts = useMemo(() => {
    return bookings
      .filter((booking) =>
        ["rejected", "cancelled", "expired"].includes(
          normalizeStatus(booking.status)
        )
      )
      .slice(0, 4);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return bookings.slice(0, 5);
  }, [bookings]);

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Dashboard" subtitle="Customer booking overview" />

          {error && (
            <div className="icb-alert-error mb-5">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  InCredoBall Sports Member Portal
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Book facilities with confidence.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Track your booking requests, monitor payment status, view your
                  next approved schedule, and stay updated through live
                  notifications.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <QuickButton to="/booking" label="Book Facility" icon={<Plus size={18} />} />
                <QuickButton
                  to="/my-bookings"
                  label="My Bookings"
                  icon={<CalendarCheck size={18} />}
                />

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white transition hover:bg-white/25 disabled:opacity-60"
                >
                  <RefreshCw
                    size={18}
                    className={`mr-2 inline-block ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Reserved"
              value={loading ? "..." : stats.reservedBookings}
              sub="Waiting for payment proof"
              icon={<CreditCard size={22} />}
              tone="blue"
            />

            <StatCard
              title="Pending"
              value={loading ? "..." : stats.pendingBookings}
              sub="Waiting for staff review"
              icon={<Clock size={22} />}
              tone="amber"
            />

            <StatCard
              title="Approved"
              value={loading ? "..." : stats.approvedBookings}
              sub="Ready for your sessions"
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />

            <StatCard
              title="Upcoming"
              value={loading ? "..." : stats.upcomingApproved}
              sub="Approved future schedules"
              icon={<CalendarClock size={22} />}
              tone="coral"
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="All Bookings"
              value={loading ? "..." : stats.totalBookings}
              sub="All submitted requests"
              icon={<FileText size={22} />}
            />

            <StatCard
              title="Rejected / Cancelled"
              value={loading ? "..." : stats.rejectedCancelled}
              sub="Requests not approved"
              icon={<XCircle size={22} />}
              tone="red"
            />

            <StatCard
              title="Unread Updates"
              value={loading ? "..." : stats.unreadNotifications}
              sub="New notifications"
              icon={<Bell size={22} />}
              tone="amber"
            />

            <StatCard
              title="Approved Total"
              value={loading ? "..." : money(stats.approvedAmount)}
              sub="Total approved booking value"
              icon={<CreditCard size={22} />}
              tone="green"
            />
          </section>

          {loading ? (
            <div className="icb-card p-8 text-sm font-semibold text-slate-500">
              Loading dashboard...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="icb-card overflow-hidden">
                  {nextBooking ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
                      <div className="p-6">
                        <p className="icb-eyebrow">Next Approved Booking</p>

                        <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                          {getFacilityName(nextBooking)}
                        </h3>

                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                          {formatDate(nextBooking.booking_date)} •{" "}
                          {formatTime(nextBooking.start_time)} -{" "}
                          {formatTime(nextBooking.end_time)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <StatusBadge status={nextBooking.status} />
                          <PaymentBadge status={nextBooking.payment_status} />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-500">
                          {getStatusMessage(nextBooking)}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between bg-[#0B1F33] p-6 text-white">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                            Amount
                          </p>

                          <p className="mt-2 text-3xl font-black text-white">
                            {money(getBookingAmount(nextBooking))}
                          </p>
                        </div>

                        <Link
                          to={`/my-bookings?highlight=${nextBooking.id}`}
                          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#B86658]"
                        >
                          View Booking
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <p className="icb-eyebrow">Next Approved Booking</p>

                      <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                        No upcoming booking yet
                      </h3>

                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        You do not have an approved future booking. Start by
                        reserving a facility and uploading your payment proof.
                      </p>

                      <Link
                        to="/booking"
                        className="icb-btn-accent mt-5"
                      >
                        <Plus size={18} />
                        Book Facility
                      </Link>
                    </div>
                  )}
                </div>

                <div className="icb-card p-6">
                  <p className="icb-eyebrow">Quick Actions</p>

                  <h3 className="mt-2 text-xl font-black text-[#0B1F33]">
                    What would you like to do?
                  </h3>

                  <div className="mt-5 grid gap-3">
                    <ActionLink
                      to="/booking"
                      title="Create New Booking"
                      description="Choose facility type and select an available slot."
                    />

                    <ActionLink
                      to="/my-bookings"
                      title="Upload Payment Proof"
                      description="Continue payment for reserved bookings."
                    />

                    <ActionLink
                      to="/notifications"
                      title="Check Updates"
                      description="Review booking and payment notifications."
                    />

                    <ActionLink
                      to="/booking-timeline"
                      title="View Booking Timeline"
                      description="Track the progress of your reservations."
                    />
                  </div>
                </div>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <DashboardListCard
                  title="Needs Payment Action"
                  description="Reserved bookings that need payment proof."
                  emptyText="No bookings need payment action."
                >
                  {paymentActionBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      paymentAction
                    />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Upcoming Approved"
                  description="Your approved future reservations."
                  emptyText="No upcoming approved bookings yet."
                >
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Pending Review"
                  description="Bookings waiting for staff action."
                  emptyText="No pending booking requests."
                >
                  {pendingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <section className="icb-card p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="icb-eyebrow">Booking Records</p>

                      <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                        Recent Booking Status
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Latest booking records from your account.
                      </p>
                    </div>

                    <Link to="/my-bookings" className="icb-btn-accent">
                      View All Bookings
                    </Link>
                  </div>

                  {recentBookings.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                      No bookings yet.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {recentBookings.map((booking) => (
                        <BookingCard
                          key={`recent-${booking.id}`}
                          booking={booking}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="icb-card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="icb-eyebrow">Activity</p>

                      <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                        Recent Updates
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Latest notifications from your account.
                      </p>
                    </div>

                    <Link
                      to="/notifications"
                      className="rounded-2xl border border-[#DED8D2] px-4 py-2 text-xs font-black text-[#0B1F33] transition hover:bg-[#F3E4DF]"
                    >
                      View All
                    </Link>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                      No recent notifications yet.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickButton({ to, label, icon }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white transition hover:bg-white/25"
    >
      {icon}
      {label}
    </Link>
  );
}

function StatCard({ title, value, sub, icon, tone = "navy" }) {
  const toneClasses = {
    navy: "bg-[#F3E4DF] text-[#B86658]",
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="mt-3 truncate text-3xl font-black text-[#0B1F33]">
            {value}
          </h3>

          <p className="mt-2 text-xs font-semibold text-slate-500">{sub}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            toneClasses[tone] || toneClasses.navy
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardListCard({ title, description, emptyText, children }) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <section className="icb-card p-6">
      <h3 className="text-xl font-black text-[#0B1F33]">{title}</h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

      <div className="mt-5 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <p className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-4 text-sm font-semibold text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function BookingCard({ booking, paymentAction = false }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  const actionUrl = paymentAction
    ? `/my-bookings?highlight=${booking.id}&pay=1`
    : `/my-bookings?highlight=${booking.id}`;

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <PaymentBadge status={paymentStatus} />
          </div>

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            {getStatusMessage(booking)}
          </p>

          {status === "rejected" && booking.rejection_reason && (
            <p className="mt-2 text-xs font-bold text-red-600">
              Reason: {booking.rejection_reason}
            </p>
          )}

          {status === "cancelled" && booking.cancellation_reason && (
            <p className="mt-2 text-xs font-bold text-slate-500">
              Reason: {booking.cancellation_reason}
            </p>
          )}

          <p className="mt-3 text-sm font-black text-[#C97B6C]">
            {money(getBookingAmount(booking))}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Link
          to={actionUrl}
          className={`inline-flex rounded-xl px-4 py-2 text-xs font-black transition ${
            paymentAction
              ? "bg-[#C97B6C] text-white hover:bg-[#B86658]"
              : "border border-[#DED8D2] text-[#0B1F33] hover:bg-[#F5F3F1]"
          }`}
        >
          {paymentAction ? "Upload Payment" : "View Details"}
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function PaymentBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getPaymentClass(
        status
      )}`}
    >
      {getStatusLabel(status || "unpaid")}
    </span>
  );
}

function NotificationItem({ item }) {
  return (
    <Link
      to="/notifications"
      className={`block rounded-2xl border p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] ${
        item.is_read
          ? "border-[#DED8D2] bg-white"
          : "border-[#C97B6C]/30 bg-[#FFF8F6]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
            item.is_read ? "bg-slate-300" : "bg-red-600"
          }`}
        />

        <div className="min-w-0">
          <h4 className="line-clamp-1 font-black text-[#0B1F33]">
            {item.title || "Notification"}
          </h4>

          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">
            {item.message || "You have a new notification."}
          </p>

          <p className="mt-2 text-xs font-bold text-slate-400">
            {formatDateTime(item.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ActionLink({ to, title, description }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]"
    >
      <p className="font-black text-[#0B1F33]">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}