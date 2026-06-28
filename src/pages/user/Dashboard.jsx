import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
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

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = String(time).slice(0, 5).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

function getStatusMessage(status) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return "Approved and ready for your scheduled session.";
  }

  if (value === "rejected") {
    return "This request was rejected. Please check the reason in My Bookings.";
  }

  if (value === "cancelled") {
    return "This booking request was cancelled.";
  }

  return "Waiting for staff approval.";
}

export default function UserDashboard() {
  const [stats, setStats] = useState({
    pendingFacility: 0,
    approvedFacility: 0,
    rejectedCancelled: 0,
    totalFacility: 0,
    notifications: 0,
    approvedAmount: 0,
    upcomingApproved: 0,
  });

  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`user-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadDashboard(false)
      )
      .subscribe();

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 7000);

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
      const today = getTodayDate();

      const approvedBookings = userBookings.filter(
        (b) => normalizeStatus(b.status) === "approved"
      );

      const upcomingApproved = approvedBookings.filter(
        (b) => String(b.booking_date || "") >= today
      );

      const approvedAmount = approvedBookings.reduce((sum, booking) => {
        return sum + Number(booking.total_amount || 0);
      }, 0);

      setStats({
        pendingFacility: userBookings.filter(
          (b) => normalizeStatus(b.status) === "pending"
        ).length,
        approvedFacility: approvedBookings.length,
        rejectedCancelled: userBookings.filter((b) =>
          ["rejected", "cancelled"].includes(normalizeStatus(b.status))
        ).length,
        totalFacility: userBookings.length,
        notifications: userNotifications.length,
        approvedAmount,
        upcomingApproved: upcomingApproved.length,
      });

      setBookings(userBookings);
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Dashboard error:", error.message);
      setError(error.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const nextBooking = useMemo(() => {
    const today = getTodayDate();

    return bookings
      .filter(
        (booking) =>
          normalizeStatus(booking.status) === "approved" &&
          String(booking.booking_date || "") >= today
      )
      .sort((a, b) => {
        const dateA = `${a.booking_date || ""} ${a.start_time || ""}`;
        const dateB = `${b.booking_date || ""} ${b.start_time || ""}`;

        return dateA.localeCompare(dateB);
      })[0];
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const today = getTodayDate();

    return bookings
      .filter(
        (booking) =>
          normalizeStatus(booking.status) === "approved" &&
          String(booking.booking_date || "") >= today
      )
      .sort((a, b) => {
        const dateA = `${a.booking_date || ""} ${a.start_time || ""}`;
        const dateB = `${b.booking_date || ""} ${b.start_time || ""}`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 4);
  }, [bookings]);

  const pendingBookings = useMemo(() => {
    return bookings
      .filter((booking) => normalizeStatus(booking.status) === "pending")
      .slice(0, 4);
  }, [bookings]);

  const statusAlerts = useMemo(() => {
    return bookings
      .filter((booking) =>
        ["rejected", "cancelled"].includes(normalizeStatus(booking.status))
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
          <Topbar title="Dashboard" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  InCredoBall Sports Member Portal
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Book facilities with confidence.
                </h2>

                <p className="mt-4 max-w-3xl text-base text-white/90">
                  Track your booking requests, view your next approved schedule,
                  and stay updated through live notifications.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <QuickButton to="/booking" label="Book Facility" />
                <QuickButton to="/my-bookings" label="My Bookings" />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Pending Requests"
              value={loading ? "..." : stats.pendingFacility}
              sub="Waiting for staff approval"
              accent="#D9A441"
            />

            <StatCard
              title="Approved Bookings"
              value={loading ? "..." : stats.approvedFacility}
              sub="Ready for your sessions"
              accent="#6BAA75"
            />

            <StatCard
              title="Upcoming Approved"
              value={loading ? "..." : stats.upcomingApproved}
              sub="Approved future schedules"
              accent="#C97B6C"
            />

            <StatCard
              title="Approved Total"
              value={loading ? "..." : money(stats.approvedAmount)}
              sub="Total value of approved bookings"
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="All Bookings"
              value={loading ? "..." : stats.totalFacility}
              sub="All submitted requests"
            />

            <StatCard
              title="Rejected / Cancelled"
              value={loading ? "..." : stats.rejectedCancelled}
              sub="Requests not approved"
              accent="#C65B5B"
            />

            <StatCard
              title="Recent Notifications"
              value={loading ? "..." : stats.notifications}
              sub="Latest account updates"
            />

            <StatCard
              title="Next Booking"
              value={loading ? "..." : nextBooking ? "Ready" : "None"}
              sub={nextBooking ? formatDate(nextBooking.booking_date) : "No upcoming approved booking"}
              accent={nextBooking ? "#6BAA75" : "#64748B"}
            />
          </section>

          {loading ? (
            <div className="rounded-[28px] border border-[#DED8D2] bg-white p-8 shadow-sm">
              Loading dashboard...
            </div>
          ) : (
            <>
              {nextBooking && (
                <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
                        Next Approved Booking
                      </p>

                      <h3 className="mt-2 text-2xl font-black text-[#2B2B2B]">
                        {getFacilityName(nextBooking)}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {formatDate(nextBooking.booking_date)} •{" "}
                        {formatTime(nextBooking.start_time)} -{" "}
                        {formatTime(nextBooking.end_time)}
                      </p>

                      <p className="mt-2 text-sm font-bold capitalize text-slate-700">
                        Session: {nextBooking.session_type || "-"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <p className="text-3xl font-black text-[#C97B6C]">
                        {money(nextBooking.total_amount || 0)}
                      </p>

                      <Link
                        to={`/my-bookings?highlight=${nextBooking.id}`}
                        className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                      >
                        View Booking
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <DashboardListCard
                  title="Upcoming Approved Bookings"
                  description="Your approved future reservations."
                  emptyText="No upcoming approved bookings yet."
                >
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Pending Requests"
                  description="Bookings waiting for staff approval."
                  emptyText="No pending booking requests."
                >
                  {pendingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Booking Alerts"
                  description="Rejected or cancelled booking updates."
                  emptyText="No rejected or cancelled bookings."
                >
                  {statusAlerts.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </DashboardListCard>
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-[#2B2B2B]">
                        Recent Booking Status Updates
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Latest booking records from your account.
                      </p>
                    </div>

                    <Link
                      to="/my-bookings"
                      className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                    >
                      View All Bookings
                    </Link>
                  </div>

                  {recentBookings.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">
                      No bookings yet.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {recentBookings.map((booking) => (
                        <BookingCard key={`recent-${booking.id}`} booking={booking} />
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Recent Activity
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest notifications from your account.
                  </p>

                  {notifications.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">
                      No recent notifications yet.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4"
                        >
                          <h4 className="font-black text-[#2B2B2B]">
                            {item.title}
                          </h4>

                          <p className="mt-1 text-sm text-slate-700">
                            {item.message}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickButton({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/25"
    >
      {label}
    </Link>
  );
}

function StatCard({ title, value, sub, accent = "#2B2B2B" }) {
  return (
    <div className="rounded-[24px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>

      <h3 className="mt-3 text-3xl font-black" style={{ color: accent }}>
        {value}
      </h3>

      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function DashboardListCard({ title, description, emptyText, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black text-[#2B2B2B]">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 space-y-3">
        {hasChildren ? (
          children
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function BookingCard({ booking }) {
  const status = normalizeStatus(booking.status);

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm text-slate-600">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)}{" "}
            - {formatTime(booking.end_time)}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {getStatusMessage(status)}
          </p>

          {status === "rejected" && booking.rejection_reason && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              Reason: {booking.rejection_reason}
            </p>
          )}

          {status === "cancelled" && booking.cancellation_reason && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Reason: {booking.cancellation_reason}
            </p>
          )}

          <p className="mt-2 text-sm font-bold text-[#C97B6C]">
            {money(booking.total_amount || 0)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4">
        <Link
          to={`/my-bookings?highlight=${booking.id}`}
          className="inline-flex rounded-xl border border-[#DED8D2] px-4 py-2 text-xs font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}