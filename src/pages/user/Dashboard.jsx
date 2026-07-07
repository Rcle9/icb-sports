// src/pages/user/Dashboard.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  Timer,
  Upload,
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

function normalizeCompletionStatus(status) {
  return String(status || "not_completed").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
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

function formatShortDate(value) {
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
  if (value === "unpaid") return "bg-amber-100 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

function getCompletionClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function getBookingAmount(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computedTotal;
}

function getPaidAmount(booking) {
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (paymentStatus === "paid") {
    return Number(booking?.amount_paid || getBookingAmount(booking) || 0);
  }

  return Number(booking?.amount_paid || 0);
}

function getBalanceAmount(booking) {
  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getBookingAmount(booking) - getPaidAmount(booking), 0);
}

function getReservationMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function isUpcomingApprovedBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const today = getTodayDate();

  return (
    status === "approved" &&
    paymentStatus === "paid" &&
    String(booking?.booking_date || "") >= today
  );
}

function needsPaymentAction(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

function isPendingReview(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return status === "pending" || paymentStatus === "pending_verification";
}

function getStatusMessage(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const minutesLeft = getReservationMinutesLeft(booking);

  if (status === "reserved" && paymentStatus === "unpaid") {
    if (minutesLeft !== null && minutesLeft > 0) {
      return `Your slot is reserved. Upload payment proof within ${minutesLeft} minute(s).`;
    }

    return "Your reservation is close to expiration. Open My Bookings to check the latest status.";
  }

  if (status === "reserved" && paymentStatus === "rejected_payment") {
    if (minutesLeft !== null && minutesLeft > 0) {
      return `Your payment proof was rejected. Upload a valid proof within ${minutesLeft} minute(s).`;
    }

    return "Your payment proof was rejected and the reservation may already be expired.";
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "Your payment proof was submitted and is waiting for staff verification.";
  }

  if (paymentStatus === "pending_verification") {
    return "Payment proof submitted. Please wait for staff verification.";
  }

  if (status === "approved" && paymentStatus === "paid") {
    return "Your booking is approved and payment has been verified.";
  }

  if (status === "approved") {
    return "Your booking is approved. Check My Bookings for more details.";
  }

  if (status === "pending") {
    return "Your booking request is waiting for staff review.";
  }

  if (status === "rejected") {
    return "This booking request was rejected. Check the reason in My Bookings.";
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

function sortBySchedule(a, b) {
  const dateA = `${a.booking_date || ""} ${String(a.start_time || "").slice(0, 5)}`;
  const dateB = `${b.booking_date || ""} ${String(b.start_time || "").slice(0, 5)}`;

  return dateA.localeCompare(dateB);
}

export default function UserDashboard() {
  const [stats, setStats] = useState({
    reservedBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    upcomingApproved: 0,
    rejectedCancelled: 0,
    expiredBookings: 0,
    completedBookings: 0,
    totalBookings: 0,
    notifications: 0,
    unreadNotifications: 0,
    approvedAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    needsPayment: 0,
    pendingVerification: 0,
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

      const upcomingApproved = userBookings.filter(isUpcomingApprovedBooking);

      const approvedAmount = approvedBookings.reduce((sum, booking) => {
        return sum + getBookingAmount(booking);
      }, 0);

      const totalPaid = userBookings.reduce((sum, booking) => {
        return sum + getPaidAmount(booking);
      }, 0);

      const totalBalance = userBookings.reduce((sum, booking) => {
        return sum + getBalanceAmount(booking);
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
          ["rejected", "cancelled"].includes(normalizeStatus(booking.status))
        ).length,
        expiredBookings: userBookings.filter(
          (booking) => normalizeStatus(booking.status) === "expired"
        ).length,
        completedBookings: userBookings.filter(
          (booking) =>
            normalizeCompletionStatus(booking.completion_status) === "completed" ||
            normalizeStatus(booking.status) === "completed"
        ).length,
        totalBookings: userBookings.length,
        notifications: userNotifications.length,
        unreadNotifications: userNotifications.filter((item) => !item.is_read)
          .length,
        approvedAmount,
        totalPaid,
        totalBalance,
        needsPayment: userBookings.filter(needsPaymentAction).length,
        pendingVerification: userBookings.filter(
          (booking) =>
            normalizePaymentStatus(booking.payment_status) ===
            "pending_verification"
        ).length,
      });

      setBookings(userBookings);
      setNotifications(userNotifications);
    } catch (err) {
      console.error("Dashboard error:", err.message);
      setError(err.message || "Failed to load dashboard.");
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
    return bookings.filter(isUpcomingApprovedBooking).sort(sortBySchedule)[0];
  }, [bookings]);

  const paymentActionBookings = useMemo(() => {
    return bookings.filter(needsPaymentAction).sort(sortBySchedule).slice(0, 5);
  }, [bookings]);

  const pendingReviewBookings = useMemo(() => {
    return bookings.filter(isPendingReview).sort(sortBySchedule).slice(0, 5);
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(isUpcomingApprovedBooking)
      .sort(sortBySchedule)
      .slice(0, 5);
  }, [bookings]);

  const statusAlerts = useMemo(() => {
    return bookings
      .filter((booking) =>
        ["rejected", "cancelled", "expired"].includes(
          normalizeStatus(booking.status)
        )
      )
      .slice(0, 5);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return bookings.slice(0, 6);
  }, [bookings]);

  const urgentPaymentBooking = useMemo(() => {
    return paymentActionBookings
      .filter((booking) => getReservationMinutesLeft(booking) !== null)
      .sort((a, b) => {
        return (
          Number(getReservationMinutesLeft(a) || 999999) -
          Number(getReservationMinutesLeft(b) || 999999)
        );
      })[0];
  }, [paymentActionBookings]);

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Dashboard"
            subtitle="Customer booking and payment overview"
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  InCredoBall Sports Member Portal
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Track your bookings and payment status.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Monitor reserved slots, upload payment proof, check staff
                  verification, view approved schedules, and read your latest
                  booking notifications.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <QuickButton
                  to="/booking"
                  label="Book Facility"
                  icon={<Plus size={18} />}
                />

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

          {urgentPaymentBooking && (
            <section className="mb-6 rounded-[28px] border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <Timer size={22} />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-700">
                      Payment Timer
                    </p>

                    <h3 className="mt-1 text-xl font-black text-[#0B1F33]">
                      {getFacilityName(urgentPaymentBooking)}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-orange-700">
                      {getReservationMinutesLeft(urgentPaymentBooking)} minute(s)
                      left before reservation expiration.
                    </p>
                  </div>
                </div>

                <Link
                  to={`/my-bookings?highlight=${urgentPaymentBooking.id}&pay=1`}
                  className="icb-btn-accent"
                >
                  <Upload size={18} />
                  Upload Payment Proof
                </Link>
              </div>
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Needs Payment"
              value={loading ? "..." : stats.needsPayment}
              sub="Upload proof before timer ends"
              icon={<Upload size={22} />}
              tone="orange"
            />

            <StatCard
              title="Payment Review"
              value={loading ? "..." : stats.pendingVerification}
              sub="Waiting for staff verification"
              icon={<CreditCard size={22} />}
              tone="blue"
            />

            <StatCard
              title="Approved"
              value={loading ? "..." : stats.approvedBookings}
              sub="Verified and ready"
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
              title="Reserved"
              value={loading ? "..." : stats.reservedBookings}
              sub="Slots reserved for payment"
              icon={<Clock size={22} />}
              tone="purple"
            />

            <StatCard
              title="Pending"
              value={loading ? "..." : stats.pendingBookings}
              sub="Waiting for staff review"
              icon={<AlertCircle size={22} />}
              tone="amber"
            />

            <StatCard
              title="Paid Total"
              value={loading ? "..." : money(stats.totalPaid)}
              sub="Total amount already paid"
              icon={<CreditCard size={22} />}
              tone="green"
            />

            <StatCard
              title="Balance"
              value={loading ? "..." : money(stats.totalBalance)}
              sub="Remaining unpaid balance"
              icon={<CreditCard size={22} />}
              tone="red"
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
              title="Completed"
              value={loading ? "..." : stats.completedBookings}
              sub="Finished sessions"
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />

            <StatCard
              title="Expired"
              value={loading ? "..." : stats.expiredBookings}
              sub="Unpaid expired reservations"
              icon={<Timer size={22} />}
              tone="orange"
            />

            <StatCard
              title="Unread Updates"
              value={loading ? "..." : stats.unreadNotifications}
              sub="New notifications"
              icon={<Bell size={22} />}
              tone="amber"
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
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px]">
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
                          <CompletionBadge
                            status={nextBooking.completion_status}
                          />
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

                          <p className="mt-2 text-xs font-semibold text-white/70">
                            Receipt: {nextBooking.receipt_number || "-"}
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
                        No upcoming approved booking yet
                      </h3>

                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        You do not have an approved future booking. Start by
                        reserving a facility and uploading your payment proof.
                      </p>

                      <Link to="/booking" className="icb-btn-accent mt-5">
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
                      description="Choose a facility and reserve an available slot."
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
                  actionPath="/my-bookings"
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
                  title="Pending Review"
                  description="Bookings waiting for staff or payment verification."
                  emptyText="No pending booking requests."
                  actionPath="/my-bookings"
                >
                  {pendingReviewBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Upcoming Approved"
                  description="Your paid and approved future reservations."
                  emptyText="No upcoming approved bookings yet."
                  actionPath="/my-bookings"
                >
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>
              </section>

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <section className="icb-card p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="icb-eyebrow">Booking Records</p>

                      <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                        Recent booking status
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
                    <EmptyState text="No bookings yet." />
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
                        Recent updates
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
                    <EmptyState text="No recent notifications yet." />
                  ) : (
                    <div className="mt-5 space-y-3">
                      {notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              </section>

              {statusAlerts.length > 0 && (
                <DashboardListCard
                  title="Booking Alerts"
                  description="Rejected, cancelled, and expired booking records."
                  emptyText="No alerts."
                  actionPath="/my-bookings"
                >
                  {statusAlerts.map((booking) => (
                    <BookingCard key={`alert-${booking.id}`} booking={booking} />
                  ))}
                </DashboardListCard>
              )}
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
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
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

function DashboardListCard({
  title,
  description,
  emptyText,
  children,
  actionPath,
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <section className="icb-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-[#0B1F33]">{title}</h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>

        {actionPath && (
          <Link
            to={actionPath}
            className="rounded-2xl border border-[#DED8D2] px-4 py-2 text-xs font-black text-[#0B1F33] transition hover:bg-[#F3E4DF]"
          >
            View
          </Link>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {hasChildren ? children : <EmptyState text={emptyText} />}
      </div>
    </section>
  );
}

function BookingCard({ booking, paymentAction = false }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);
  const minutesLeft = getReservationMinutesLeft(booking);

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
            {formatShortDate(booking.booking_date)} •{" "}
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <PaymentBadge status={paymentStatus} />

            {completionStatus !== "not_completed" && (
              <CompletionBadge status={completionStatus} />
            )}

            {booking.is_walk_in && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-700">
                Walk-in
              </span>
            )}
          </div>

          {minutesLeft !== null &&
            status === "reserved" &&
            ["unpaid", "rejected_payment"].includes(paymentStatus) && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700">
                <Timer size={14} />
                {minutesLeft} minute(s) left
              </p>
            )}

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            {getStatusMessage(booking)}
          </p>

          {paymentStatus === "rejected_payment" &&
            booking.payment_rejection_reason && (
              <p className="mt-2 text-xs font-bold text-red-600">
                Payment reason: {booking.payment_rejection_reason}
              </p>
            )}

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

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MiniAmount label="Total" value={money(getBookingAmount(booking))} />
            <MiniAmount label="Paid" value={money(getPaidAmount(booking))} />
            <MiniAmount label="Balance" value={money(getBalanceAmount(booking))} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          to={actionUrl}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            paymentAction
              ? "bg-[#C97B6C] text-white hover:bg-[#B86658]"
              : "border border-[#DED8D2] text-[#0B1F33] hover:bg-[#F5F3F1]"
          }`}
        >
          {paymentAction && <Upload size={15} />}
          {paymentAction ? "Upload Payment" : "View Details"}
        </Link>
      </div>
    </div>
  );
}

function MiniAmount({ label, value }) {
  return (
    <div className="rounded-xl bg-[#F5F3F1] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-black text-[#0B1F33]">{value}</p>
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
      {formatStatusLabel(status)}
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
      {formatStatusLabel(status || "unpaid")}
    </span>
  );
}

function CompletionBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getCompletionClass(
        status
      )}`}
    >
      {formatStatusLabel(status || "not_completed")}
    </span>
  );
}

function NotificationItem({ item }) {
  const actionUrl = item.action_url || "/notifications";

  return (
    <Link
      to={actionUrl}
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

function EmptyState({ text }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-4 text-sm font-semibold text-slate-500">
      {text}
    </p>
  );
}