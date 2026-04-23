import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";

export default function AdminNotifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");
      const data = await getUserNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId, isRead) {
    if (isRead) return;

    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    } catch (err) {
      setError(err.message || "Failed to mark notification as read.");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setProcessing(true);
      setError("");
      await markAllAsRead(user.id);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setProcessing(false);
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Notifications" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Admin Alerts Center
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Review system alerts, approvals, and platform updates.
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                  Stay informed about key activity across bookings, facilities, maintenance, and system operations.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                  Unread
                </p>
                <p className="mt-2 text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </div>

          <Card className="flex min-h-[520px] flex-col">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">All Notifications</h2>
                <p className="mt-1 text-sm text-black">
                  View and manage your recent notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={processing || unreadCount === 0}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {processing ? "Processing..." : "Mark all as read"}
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="text-black">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="text-black">No notifications yet.</p>
            ) : (
              <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      handleMarkAsRead(notification.id, notification.is_read)
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      notification.is_read
                        ? "border-slate-200 bg-white"
                        : "border-blue-200 bg-blue-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="safe-text text-base font-semibold text-black">
                          {notification.title}
                        </p>
                        <p className="safe-text mt-2 text-sm leading-6 text-black">
                          {notification.message}
                        </p>
                        <p className="mt-3 text-xs text-slate-600">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!notification.is_read ? (
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-red-500"></span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}