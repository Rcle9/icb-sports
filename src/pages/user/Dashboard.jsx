import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = String(time).slice(0, 5).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

export default function UserDashboard() {
  const [stats, setStats] = useState({
    pendingFacility: 0,
    approvedFacility: 0,
    totalFacility: 0,
    notifications: 0,
  });

  const [notifications, setNotifications] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel(`user-dashboard-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadDashboard()
      )
      .subscribe();

    const interval = setInterval(() => {
      loadDashboard();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

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
          .limit(5),
      ]);

      const bookings = bookingsRes.data || [];
      const userNotifications = notificationsRes.data || [];

      setStats({
        pendingFacility: bookings.filter((b) => b.status === "pending").length,
        approvedFacility: bookings.filter((b) => b.status === "approved")
          .length,
        totalFacility: bookings.length,
        notifications: userNotifications.length,
      });

      setRecentBookings(bookings.slice(0, 5));
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Dashboard error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Dashboard" />

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">
              InCredoBall Sports Member Portal
            </p>

            <h2 className="mt-3 text-4xl font-black">
              Book facilities with confidence.
            </h2>

            <p className="mt-4 max-w-3xl text-base text-white/90">
              Track your facility requests, stay updated through live
              notifications, and manage your sports activities in one place.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Pending Facility Bookings"
              value={stats.pendingFacility}
              sub="Waiting for staff approval"
            />

            <StatCard
              title="Approved Facility Bookings"
              value={stats.approvedFacility}
              sub="Ready for your scheduled sessions"
            />

            <StatCard
              title="Total Facility Bookings"
              value={stats.totalFacility}
              sub="All your submitted facility requests"
            />

            <StatCard
              title="Recent Notifications"
              value={stats.notifications}
              sub="Latest account updates"
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Recent Activity
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest updates from your account.
              </p>

              {loading ? (
                <p className="mt-5 text-sm text-slate-500">Loading...</p>
              ) : notifications.length === 0 ? (
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

            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                My Recent Bookings
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your most recent facility bookings.
              </p>

              {loading ? (
                <p className="mt-5 text-sm text-slate-500">Loading...</p>
              ) : recentBookings.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">No bookings yet.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {recentBookings.map((booking) => (
                    <BookingCard
                      key={`booking-${booking.id}`}
                      title={booking.facilities?.name || "Facility Booking"}
                      date={booking.booking_date}
                      start={booking.start_time}
                      end={booking.end_time}
                      status={booking.status}
                      total={booking.total_amount}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-[24px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>

      <h3 className="mt-3 text-3xl font-black text-[#2B2B2B]">{value}</h3>

      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function BookingCard({ title, date, start, end, status, total }) {
  const statusClass =
    status === "approved"
      ? "badge-approved"
      : status === "rejected"
      ? "badge-rejected"
      : "badge-pending";

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-[#2B2B2B]">{title}</h4>

          <p className="mt-1 text-sm text-slate-600">
            {date} • {formatTime(start)} - {formatTime(end)}
          </p>

          <p className="mt-2 text-sm font-bold text-[#C97B6C]">
            {money(total)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass}`}
        >
          {status || "pending"}
        </span>
      </div>
    </div>
  );
}