import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { getUserNotifications } from "../../services/notificationService";
import { getUserBookings } from "../../services/bookingService";
import { getUserCoachBookings } from "../../services/coachingService";

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export default function UserDashboard() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [coachBookings, setCoachBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadDashboardData();
  }, [user?.id]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [notificationsData, bookingsData, coachBookingsData] = await Promise.all([
        getUserNotifications(user.id),
        getUserBookings(user.id),
        getUserCoachBookings(user.id),
      ]);

      setNotifications(notificationsData || []);
      setBookings(bookingsData || []);
      setCoachBookings(coachBookingsData || []);
    } finally {
      setLoading(false);
    }
  }

  const pendingBookings = bookings.filter((item) => item.status === "pending").length;
  const approvedBookings = bookings.filter((item) => item.status === "approved").length;
  const pendingCoachings = coachBookings.filter((item) => item.status === "pending").length;
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="User Dashboard" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  InCredoBall Sports Member Portal
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Book facilities and coaching with confidence.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-blue-100 md:text-base">
                  Track your requests, stay updated through live notifications,
                  and manage your sports activities in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-black">Pending Facility Bookings</p>
              <h3 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : pendingBookings}
              </h3>
              <p className="mt-2 text-xs text-slate-700">
                Waiting for staff approval
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Approved Facility Bookings</p>
              <h3 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : approvedBookings}
              </h3>
              <p className="mt-2 text-xs text-slate-700">
                Ready for your scheduled sessions
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Pending Coaching Requests</p>
              <h3 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : pendingCoachings}
              </h3>
              <p className="mt-2 text-xs text-slate-700">
                Awaiting review and confirmation
              </p>
            </Card>

            <Card>
              <p className="text-sm text-black">Unread Notifications</p>
              <h3 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : unreadNotifications}
              </h3>
              <p className="mt-2 text-xs text-slate-700">
                Live alerts from your activity
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-black">Recent Activity</h3>
                <p className="mt-1 text-sm text-black">
                  Latest updates from your account.
                </p>
              </div>

              {loading ? (
                <p className="text-black">Loading activity...</p>
              ) : notifications.length === 0 ? (
                <p className="text-black">No recent activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 ${
                        item.is_read
                          ? "border-slate-200 bg-slate-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="safe-text font-semibold text-black">
                            {item.title}
                          </p>
                          <p className="safe-text mt-1 text-sm text-black">
                            {item.message}
                          </p>
                        </div>
                        {!item.is_read ? (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-700">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="flex min-h-[420px] flex-col">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-black">Upcoming Requests</h3>
                <p className="mt-1 text-sm text-black">
                  Your most recent bookings and coaching entries.
                </p>
              </div>

              <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[60vh]">
                {loading ? (
                  <p className="text-black">Loading requests...</p>
                ) : bookings.length === 0 && coachBookings.length === 0 ? (
                  <p className="text-black">No requests yet.</p>
                ) : (
                  <>
                    {bookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="safe-text font-semibold text-black">
                          {booking.facilities?.name || "Facility"}
                        </p>
                        <p className="mt-1 text-sm text-black">
                          {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                          {formatTime(booking.end_time)}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          {booking.status}
                        </p>
                      </div>
                    ))}

                    {coachBookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="safe-text font-semibold text-black">
                          {booking.coaches?.name || "Coach"}
                        </p>
                        <p className="mt-1 text-sm text-black">
                          {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                          {formatTime(booking.end_time)}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          {booking.status}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}