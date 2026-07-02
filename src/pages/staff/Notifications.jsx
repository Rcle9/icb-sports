import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  MailOpen,
  Search,
  Trash2,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function getNotificationType(notification) {
  return (
    notification?.type ||
    notification?.notification_type ||
    notification?.category ||
    "system"
  );
}

function getNotificationTitle(notification) {
  return (
    notification?.title ||
    notification?.subject ||
    notification?.heading ||
    "System Notification"
  );
}

function getNotificationMessage(notification) {
  return (
    notification?.message ||
    notification?.body ||
    notification?.description ||
    "No notification message."
  );
}

function getNotificationStatus(notification) {
  return notification?.is_read ? "Read" : "Unread";
}

function getTypeClass(type) {
  const value = normalizeText(type);

  if (value.includes("booking")) return "bg-blue-100 text-blue-700";
  if (value.includes("payment")) return "bg-green-100 text-green-700";
  if (value.includes("maintenance")) return "bg-orange-100 text-orange-700";
  if (value.includes("inventory")) return "bg-purple-100 text-purple-700";
  if (value.includes("cancel")) return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default function StaffNotifications() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`staff-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadNotifications(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const data = await getUserNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRead(id) {
    try {
      setActionLoading(true);
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
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setActionLoading(true);
      await markAllAsRead(user.id);

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearRead() {
    try {
      setActionLoading(true);
      setError("");

      const readIds = notifications
        .filter((notification) => notification.is_read)
        .map((notification) => notification.id);

      if (readIds.length === 0) return;

      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .in("id", readIds);

      if (deleteError) throw deleteError;

      setNotifications((prev) =>
        prev.filter((notification) => !notification.is_read)
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to clear read notifications. Check notification delete policy."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((notification) => notification.is_read).length;
  }, [notifications]);

  const typeOptions = useMemo(() => {
    const types = notifications.map((notification) =>
      getNotificationType(notification)
    );

    return ["all", ...new Set(types.filter(Boolean))];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const keyword = normalizeText(search);

    return notifications.filter((notification) => {
      const isRead = Boolean(notification.is_read);
      const type = getNotificationType(notification);

      if (readFilter === "read" && !isRead) return false;
      if (readFilter === "unread" && isRead) return false;
      if (typeFilter !== "all" && type !== typeFilter) return false;

      if (!keyword) return true;

      const title = normalizeText(getNotificationTitle(notification));
      const message = normalizeText(getNotificationMessage(notification));
      const notificationType = normalizeText(type);
      const details = normalizeText(notification.details);

      return (
        title.includes(keyword) ||
        message.includes(keyword) ||
        notificationType.includes(keyword) ||
        details.includes(keyword)
      );
    });
  }, [notifications, readFilter, typeFilter, search]);

  return (
    <div className="min-h-screen bg-[#F5F3F1] lg:pl-[280px]">
      <Sidebar
        role="staff"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <Topbar
            title="Notifications"
            subtitle="Real-time system alerts and booking updates."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <section className="mb-5 rounded-[24px] bg-[#2B2B2B] p-5 text-white shadow-sm sm:rounded-[28px] sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D88E80]">
                  Staff Notification Center
                </p>

                <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                  Real-time system alerts and updates.
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75 sm:text-base">
                  Track booking requests, payment updates, maintenance alerts,
                  inventory notices, and system notifications.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
                <SummaryCard label="Total" value={notifications.length} />
                <SummaryCard label="Unread" value={unreadCount} />
                <SummaryCard label="Shown" value={filteredNotifications.length} />
              </div>
            </div>
          </section>

          <section className="mb-5 rounded-[24px] border border-[#DED8D2] bg-white p-5 shadow-sm sm:rounded-[28px] sm:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#2B2B2B]">
                  Notification Filters
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Filter unread alerts, notification type, or search by keyword.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading || unreadCount === 0}
                  className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark All Read
                </button>

                <button
                  type="button"
                  onClick={handleClearRead}
                  disabled={actionLoading || readCount === 0}
                  className="rounded-2xl border border-[#DED8D2] bg-white px-5 py-3 text-sm font-black text-[#2B2B2B] transition hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Read
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-black text-[#2B2B2B]">
                  Search
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, message, type, or details"
                    className="w-full rounded-2xl border border-[#DED8D2] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#C97B6C] focus:ring-4 focus:ring-[#C97B6C]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#2B2B2B]">
                  Read Status
                </label>

                <select
                  value={readFilter}
                  onChange={(event) => setReadFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C97B6C] focus:ring-4 focus:ring-[#C97B6C]/10"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[#2B2B2B]">
                  Type
                </label>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C97B6C] focus:ring-4 focus:ring-[#C97B6C]/10"
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type === "all"
                        ? "All"
                        : String(type).replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#DED8D2] bg-white p-5 shadow-sm sm:rounded-[28px] sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#2B2B2B]">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredNotifications.length} of{" "}
                  {notifications.length} notification(s).
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-[#F3E4DF] px-4 py-3 text-sm font-black text-[#C97B6C]">
                <Bell size={18} />
                {unreadCount} unread
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <MailOpen className="mx-auto text-slate-400" size={36} />
                <h3 className="mt-3 text-lg font-black text-[#2B2B2B]">
                  No notifications found
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  There are no notifications matching your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-white">
      <p className="text-xs font-black uppercase tracking-widest text-white/45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function NotificationCard({ notification, onRead, actionLoading }) {
  const type = getNotificationType(notification);
  const title = getNotificationTitle(notification);
  const message = getNotificationMessage(notification);
  const isRead = Boolean(notification.is_read);

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isRead
          ? "border-slate-200 bg-white"
          : "border-[#C97B6C]/30 bg-[#FFF7F5]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getTypeClass(
                type
              )}`}
            >
              {String(type).replaceAll("_", " ")}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                isRead
                  ? "bg-slate-100 text-slate-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {getNotificationStatus(notification)}
            </span>
          </div>

          <h3 className="mt-3 break-words text-lg font-black text-[#2B2B2B]">
            {title}
          </h3>

          <p className="mt-2 break-words text-sm leading-7 text-slate-600">
            {message}
          </p>

          {notification.details && (
            <p className="mt-3 rounded-2xl bg-white p-4 text-sm leading-7 text-slate-600">
              {notification.details}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} />
              {formatDateTime(notification.created_at)}
            </span>
          </div>
        </div>

        {!isRead && (
          <button
            type="button"
            onClick={() => onRead(notification.id)}
            disabled={actionLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2B2B2B] px-4 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={17} />
            Mark Read
          </button>
        )}
      </div>
    </article>
  );
}