// src/pages/shared/RoleNotifications.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  MailOpen,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

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

function formatLabel(value) {
  return String(value || "Notification")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMetadataValue(metadata, key) {
  if (!metadata || typeof metadata !== "object") return "-";
  return metadata[key] ?? "-";
}

function getReferenceId(notification) {
  const metadata = notification?.metadata || {};

  return (
    notification?.reference_id ||
    metadata.booking_id ||
    metadata.bookingId ||
    metadata.reference_id ||
    metadata.id ||
    ""
  );
}

function isBookingNotification(notification) {
  const referenceType = String(notification?.reference_type || "").toLowerCase();
  const type = String(notification?.type || "").toLowerCase();

  return (
    referenceType === "bookings" ||
    referenceType === "booking" ||
    type.includes("booking") ||
    type.includes("payment") ||
    type.includes("reservation") ||
    type.includes("receipt")
  );
}

function getActionUrl(notification, fallbackPath) {
  if (notification?.action_url) return notification.action_url;

  const referenceId = getReferenceId(notification);

  if (referenceId && isBookingNotification(notification)) {
    return `${fallbackPath}?highlight=${referenceId}`;
  }

  return fallbackPath;
}

function getNotificationPreview(notification) {
  const metadata = notification?.metadata || {};

  const facility =
    metadata.facility_name ||
    metadata.facility ||
    metadata.facilityName ||
    "";

  const bookingDate =
    metadata.booking_date ||
    metadata.date ||
    metadata.bookingDate ||
    "";

  const time =
    metadata.start_time && metadata.end_time
      ? `${metadata.start_time} - ${metadata.end_time}`
      : "";

  return [facility, bookingDate, time].filter(Boolean).join(" • ");
}

function getNotificationTone(type) {
  const value = String(type || "").toLowerCase();

  if (
    [
      "payment_approved",
      "payment_verified",
      "booking_approved",
      "receipt_issued",
      "booking_completed",
      "completed",
      "approved",
    ].includes(value)
  ) {
    return {
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      dot: "bg-green-500",
      card: "bg-green-50/40",
      icon: "bg-green-100 text-green-700",
    };
  }

  if (
    [
      "booking_reserved",
      "payment_uploaded",
      "booking_created",
      "new_booking",
      "booking_request",
      "booking_update",
      "payment_pending",
      "payment_submitted",
      "pending_verification",
    ].includes(value)
  ) {
    return {
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
      card: "bg-blue-50/40",
      icon: "bg-blue-100 text-blue-700",
    };
  }

  if (
    [
      "payment_rejected",
      "booking_rejected",
      "booking_cancelled",
      "booking_expired",
      "reservation_expired",
      "cancelled",
      "expired",
      "rejected",
    ].includes(value)
  ) {
    return {
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      card: "bg-red-50/40",
      icon: "bg-red-100 text-red-700",
    };
  }

  if (
    [
      "maintenance_added",
      "maintenance_cancelled",
      "facility_maintenance",
      "maintenance",
    ].includes(value)
  ) {
    return {
      border: "border-purple-200",
      badge: "bg-purple-100 text-purple-700",
      dot: "bg-purple-500",
      card: "bg-purple-50/40",
      icon: "bg-purple-100 text-purple-700",
    };
  }

  return {
    border: "border-[#DED8D2]",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    card: "bg-white",
    icon: "bg-[#F3E4DF] text-[#B86658]",
  };
}

export default function RoleNotifications({
  role = "staff",
  title = "Notifications",
  subtitle = "Notification center",
  heroEyebrow = "Notification Center",
  heroTitle = "Stay updated.",
  heroDescription = "View important system notifications and alerts.",
  defaultActionPath = "/staff/manage-bookings",
  defaultTimelinePath = "/staff/manage-bookings",
  bookingActionPath = "/staff/manage-bookings",
}) {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((item) => item.is_read).length;
  }, [notifications]);

  const totalCount = notifications.length;

  const notificationTypes = useMemo(() => {
    const types = notifications.map((item) => item.type).filter(Boolean);
    return [...new Set(types)];
  }, [notifications]);

  const latestUnread = useMemo(() => {
    return notifications.find((item) => !item.is_read) || null;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" && !item.is_read) ||
        (readFilter === "read" && item.is_read);

      const matchesType = typeFilter === "all" || item.type === typeFilter;

      const searchableText = [
        item.title,
        item.message,
        item.type,
        item.reference_type,
        item.reference_id,
        item.role,
        JSON.stringify(item.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" ||
        searchableText.includes(search.trim().toLowerCase());

      return matchesRead && matchesType && matchesSearch;
    });
  }, [notifications, readFilter, typeFilter, search]);

  useEffect(() => {
    if (!user?.id && !role) return;
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  useEffect(() => {
    if (!user?.id && !role) return;

    const channel = supabase
      .channel(`${role}-notifications-${user?.id || "role"}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  async function loadNotifications(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      const safeUserId =
        user?.id || "00000000-0000-0000-0000-000000000000";

      if (role === "admin") {
        query = query.or(`role.eq.admin,user_id.eq.${safeUserId}`);
      } else if (role === "staff") {
        query = query.or(`role.eq.staff,user_id.eq.${safeUserId}`);
      } else {
        query = query.eq("user_id", safeUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId);

    if (error) throw error;
  }

  async function handleOpenNotification(notification) {
    try {
      setSelectedNotification(notification);

      if (!notification.is_read) {
        await markAsRead(notification.id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );

        setSelectedNotification((prev) =>
          prev?.id === notification.id ? { ...prev, is_read: true } : prev
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open notification.");
    }
  }

  async function handleMarkAsRead(notification) {
    try {
      setProcessing(notification.id);
      setError("");
      setMessage("");

      await markAsRead(notification.id);

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );

      setSelectedNotification((prev) =>
        prev?.id === notification.id ? { ...prev, is_read: true } : prev
      );

      setMessage("Notification marked as read.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark notification as read.");
    } finally {
      setProcessing("");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setProcessing("mark-all");
      setError("");
      setMessage("");

      const ids = notifications
        .filter((item) => !item.is_read)
        .map((item) => item.id);

      if (ids.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .in("id", ids);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      setSelectedNotification((prev) =>
        prev ? { ...prev, is_read: true } : prev
      );

      setMessage("All notifications marked as read.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setProcessing("");
    }
  }

  async function handleDelete(notification) {
    const confirmed = window.confirm("Delete this notification?");

    if (!confirmed) return;

    try {
      setProcessing(notification.id);
      setError("");
      setMessage("");

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notification.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.filter((item) => item.id !== notification.id)
      );

      if (selectedNotification?.id === notification.id) {
        setSelectedNotification(null);
      }

      setMessage("Notification deleted.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete notification.");
    } finally {
      setProcessing("");
    }
  }

  async function handleClearRead() {
    const confirmed = window.confirm("Clear all read notifications?");

    if (!confirmed) return;

    try {
      setProcessing("clear-read");
      setError("");
      setMessage("");

      const ids = notifications
        .filter((item) => item.is_read)
        .map((item) => item.id);

      if (ids.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", ids);

      if (error) throw error;

      setNotifications((prev) => prev.filter((item) => !item.is_read));

      if (selectedNotification?.is_read) {
        setSelectedNotification(null);
      }

      setMessage("Read notifications cleared.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to clear read notifications.");
    } finally {
      setProcessing("");
    }
  }

  async function handleGoToAction(notification = selectedNotification) {
    if (!notification) return;

    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }

      const fallback = isBookingNotification(notification)
        ? bookingActionPath
        : defaultActionPath;

      navigate(getActionUrl(notification, fallback));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open related page.");
    }
  }

  async function handleGoToTimeline(notification = selectedNotification) {
    if (!notification) return;

    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }

      const referenceId = getReferenceId(notification);

      if (referenceId) {
        navigate(`${defaultTimelinePath}?highlight=${referenceId}`);
      } else {
        navigate(defaultTimelinePath);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open timeline.");
    }
  }

  function resetFilters() {
    setReadFilter("all");
    setTypeFilter("all");
    setSearch("");
  }

  if (authLoading || loading) {
    return (
      <div className="page-shell">
        <Sidebar role={role} />

        <main className="page-main">
          <div className="page-container">
            <Topbar title={title} subtitle={subtitle} />

            <div className="icb-card p-8 text-sm font-semibold text-slate-500">
              Loading notifications...
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Sidebar role={role} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title={title} subtitle={subtitle} />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  {heroEyebrow}
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  {heroTitle}
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  {heroDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Total" value={totalCount} />
                <HeroStat label="Unread" value={unreadCount} />
                <HeroStat label="Read" value={readCount} />
                <HeroStat label="Types" value={notificationTypes.length} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Total" value={totalCount} icon={<Bell size={20} />} />

            <MiniStat
              label="Unread"
              value={unreadCount}
              icon={<MailOpen size={20} />}
              tone="red"
            />

            <MiniStat
              label="Read"
              value={readCount}
              icon={<CheckCheck size={20} />}
              tone="green"
            />

            <MiniStat
              label="Latest"
              value={latestUnread ? "New" : "Clear"}
              icon={<Clock size={20} />}
              tone={latestUnread ? "amber" : "blue"}
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="icb-eyebrow">Filters</p>

                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Find notifications
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Search and filter booking, payment, maintenance, and system
                  alerts.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  className="icb-btn-light"
                >
                  <RefreshCw size={17} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={processing === "mark-all" || unreadCount === 0}
                  className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCheck size={17} />
                  {processing === "mark-all" ? "Updating..." : "Mark All Read"}
                </button>

                <button
                  type="button"
                  onClick={handleClearRead}
                  disabled={processing === "clear-read" || readCount === 0}
                  className="icb-btn-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={17} />
                  {processing === "clear-read" ? "Clearing..." : "Clear Read"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className="icb-label flex items-center gap-2">
                  <Search size={16} />
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, message, type, booking ID, or payment update"
                  className="icb-input"
                />
              </div>

              <div>
                <label className="icb-label flex items-center gap-2">
                  <Filter size={16} />
                  Read Status
                </label>

                <select
                  value={readFilter}
                  onChange={(event) => setReadFilter(event.target.value)}
                  className="icb-select"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div>
                <label className="icb-label">Type</label>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="icb-select"
                >
                  <option value="all">All Types</option>
                  {notificationTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="icb-btn-light">
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="icb-eyebrow">Inbox</p>

                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Notifications
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Click a notification to view complete details.
                  </p>
                </div>

                <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#C97B6C]">
                  {filteredNotifications.length} shown
                </span>
              </div>

              {filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                    <Bell size={26} />
                  </div>

                  <h3 className="mt-4 text-xl font-black text-[#0B1F33]">
                    No notifications found
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-slate-500">
                    Notifications will appear here once there are updates from
                    the system.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      selected={
                        selectedNotification &&
                        selectedNotification.id === notification.id
                      }
                      processing={processing === notification.id}
                      onOpen={() => handleOpenNotification(notification)}
                      onRead={() => handleMarkAsRead(notification)}
                      onDelete={() => handleDelete(notification)}
                      onAction={() => handleGoToAction(notification)}
                      onTimeline={() => handleGoToTimeline(notification)}
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="icb-card p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="icb-eyebrow">Details</p>

                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Notification preview
                  </h3>
                </div>

                {selectedNotification && (
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DED8D2] text-[#0B1F33] transition hover:bg-[#F5F3F1]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {selectedNotification ? (
                <NotificationDetailsPanel
                  notification={selectedNotification}
                  profile={profile}
                  processing={processing === selectedNotification.id}
                  onAction={() => handleGoToAction(selectedNotification)}
                  onTimeline={() => handleGoToTimeline(selectedNotification)}
                  onDelete={() => handleDelete(selectedNotification)}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-6 text-sm font-semibold text-slate-500">
                  Select a notification from the list to view complete details.
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function NotificationCard({
  notification,
  selected,
  processing,
  onOpen,
  onRead,
  onDelete,
  onAction,
  onTimeline,
}) {
  const tone = getNotificationTone(notification.type);
  const preview = getNotificationPreview(notification);

  return (
    <div
      className={`rounded-[24px] border p-5 transition ${
        selected
          ? "border-[#C97B6C] bg-[#FFF8F6] shadow-sm ring-4 ring-[#C97B6C]/15"
          : notification.is_read
          ? "border-[#DED8D2] bg-white hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]"
          : `${tone.border} ${tone.card} shadow-sm`
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <span
            className={`mt-2 h-3 w-3 shrink-0 rounded-full ${
              notification.is_read ? "bg-slate-300" : tone.dot
            }`}
          />

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {!notification.is_read && (
                <Badge className="bg-red-100 text-red-700">Unread</Badge>
              )}

              <Badge className={tone.badge}>{formatLabel(notification.type)}</Badge>

              {notification.role && (
                <Badge className="bg-slate-100 text-slate-700">
                  {notification.role}
                </Badge>
              )}
            </div>

            <h4 className="text-lg font-black text-[#0B1F33]">
              {notification.title || "Notification"}
            </h4>

            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              {notification.message || "You have a new notification."}
            </p>

            {preview && (
              <p className="mt-2 text-xs font-bold text-[#C97B6C]">{preview}</p>
            )}

            <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
              <Clock size={14} />
              {formatDateTime(notification.created_at)}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap gap-2 lg:w-[165px] lg:flex-col lg:items-stretch">
          <button
            type="button"
            onClick={onAction}
            disabled={processing}
            className="icb-btn-accent"
          >
            <ExternalLink size={16} />
            Open
          </button>

          <button
            type="button"
            onClick={onTimeline}
            disabled={processing}
            className="icb-btn-light"
          >
            Related Page
          </button>

          {!notification.is_read && (
            <button
              type="button"
              onClick={onRead}
              disabled={processing}
              className="icb-btn-light"
            >
              Read
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={processing}
            className="icb-btn-danger"
          >
            {processing ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationDetailsPanel({
  notification,
  profile,
  processing,
  onAction,
  onTimeline,
  onDelete,
}) {
  const tone = getNotificationTone(notification.type);
  const metadata = notification.metadata || {};

  return (
    <div>
      <div className={`rounded-2xl border p-4 ${tone.border} ${tone.card}`}>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
          >
            <Bell size={22} />
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge className={tone.badge}>{formatLabel(notification.type)}</Badge>

              <Badge
                className={
                  notification.is_read
                    ? "bg-slate-100 text-slate-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {notification.is_read ? "Read" : "Unread"}
              </Badge>
            </div>

            <h4 className="text-xl font-black text-[#0B1F33]">
              {notification.title || "Notification"}
            </h4>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {notification.message || "You have a new notification."}
            </p>

            <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
              <Clock size={14} />
              {formatDateTime(notification.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        <DetailItem
          label="Reference Type"
          value={notification.reference_type || "-"}
        />
        <DetailItem label="Reference ID" value={getReferenceId(notification) || "-"} />
        <DetailItem label="Role" value={notification.role || "-"} />
        <DetailItem
          label="Facility"
          value={getMetadataValue(metadata, "facility_name")}
        />
        <DetailItem
          label="Booking Date"
          value={getMetadataValue(metadata, "booking_date")}
        />
        <DetailItem
          label="Start Time"
          value={getMetadataValue(metadata, "start_time")}
        />
        <DetailItem
          label="End Time"
          value={getMetadataValue(metadata, "end_time")}
        />
        <DetailItem
          label="Amount Paid"
          value={getMetadataValue(metadata, "amount_paid")}
        />
        <DetailItem
          label="Receipt Number"
          value={getMetadataValue(metadata, "receipt_number")}
        />
        <DetailItem label="Current User Role" value={profile?.role || "-"} />
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-black text-[#0B1F33]">More Details</p>

        <pre className="mt-3 max-h-[240px] overflow-auto rounded-2xl bg-white p-4 text-xs text-slate-700">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={onAction}
          disabled={processing}
          className="icb-btn-accent"
        >
          <ExternalLink size={18} />
          Open Related Page
        </button>

        <button
          type="button"
          onClick={onTimeline}
          disabled={processing}
          className="icb-btn-light"
        >
          View Booking Management
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={processing}
          className="icb-btn-danger"
        >
          <Trash2 size={18} />
          {processing ? "Deleting..." : "Delete Notification"}
        </button>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, icon, tone = "navy" }) {
  const tones = {
    navy: "bg-[#F3E4DF] text-[#B86658]",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#0B1F33]">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tones[tone] || tones.navy
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#0B1F33]">
        {String(value || "-")}
      </p>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {children}
    </span>
  );
}