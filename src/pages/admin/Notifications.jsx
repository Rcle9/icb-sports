import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";

export default function AdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadNotifications() {
    try {
      setError("");
      const data = await getUserNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    }
  }

  async function handleRead(id) {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setError(err.message || "Failed to mark notification as read.");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead(user.id);
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to mark all as read.");
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen bg-[#f5f6f8]">
      <Sidebar role="admin" />

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="Notifications" />

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#0f172a]">
                  Admin Notifications
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>

              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Mark all as read
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleRead(notification.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      notification.is_read
                        ? "bg-gray-50 border-gray-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#0f172a]">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!notification.is_read ? (
                        <span className="w-3 h-3 rounded-full bg-red-500 mt-1"></span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}