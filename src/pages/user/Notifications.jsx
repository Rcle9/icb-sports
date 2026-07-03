import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  clearReadNotifications,
  deleteNotification,
  getCurrentProfile,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "../../services/notificationService";

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStatusLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function getRoleLabel(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";

  return "User";
}

function getSidebarRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function getNotificationTone(type) {
  const value = String(type || "").toLowerCase();

  if (
    [
      "payment_approved",
      "booking_approved",
      "walk_in_booking",
      "payment_verified",
      "booking_completion",
    ].includes(value)
  ) {
    return {
      badge: "bg-green-100 text-green-700",
      dot: "bg-green-500",
      border: "border-green-200",
    };
  }

  if (
    [
      "payment_uploaded",
      "booking_reserved",
      "new_booking",
      "booking_created",
    ].includes(value)
  ) {
    return {
      badge: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
      border: "border-blue-200",
    };
  }

  if (
    [
      "payment_rejected",
      "booking_cancelled",
      "booking_rejected",
    ].includes(value)
  ) {
    return {
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      border: "border-red-200",
    };
  }

  if (["booking_expired", "reservation_expired"].includes(value)) {
    return {
      badge: "bg-orange-100 text-orange-700",
      dot: "bg-orange-500",
      border: "border-orange-200",
    };
  }

  if (
    [
      "maintenance_added",
      "maintenance_cancelled",
      "facility_maintenance",
    ].includes(value)
  ) {
    return {
      badge: "bg-purple-100 text-purple-700",
      dot: "bg-purple-500",
      border: "border-purple-200",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    border: "border-[#DED8D2]",
  };
}

function getDefaultActionUrl(notification, profile) {
  const role = String(profile?.role || "user").toLowerCase();
  const type = String(notification?.type || "").toLowerCase();
  const referenceId = notification?.reference_id;

  if (notification?.action_url) return notification.action_url;

  if (role === "staff") {
    if (referenceId && notification?.reference_type === "bookings") {
      return `/staff/manage-bookings?highlight=${referenceId}`;
    }

    return "/staff/manage-bookings";
  }

  if (role === "admin") {
    return "/admin/command-center";
  }

  if (referenceId && notification?.reference_type === "bookings") {
    if (type === "booking_reserved" || type === "payment_rejected") {
      return `/my-bookings?highlight=${referenceId}&pay=1`;
    }

    return `/my-bookings?highlight=${referenceId}`;
  }

  return "/my-bookings";
}

function getMetadataValue(metadata, key) {
  if (!metadata || typeof metadata !== "object") return "-";

  return metadata[key] ?? "-";
}

export default function Notifications() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const notificationTypes = useMemo(() => {
    const values = notifications
      .map((notification) => notification.type)
      .filter(Boolean);

    return [...new Set(values)];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesRead =
        filter === "all" ||
        (filter === "unread" && !notification.is_read) ||
        (filter === "read" && notification.is_read);

      const matchesType =
        typeFilter === "all" || notification.type === typeFilter;

      const searchText = [
        notification.title,
        notification.message,
        notification.type,
        notification.reference_type,
        JSON.stringify(notification.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return matchesRead && matchesType && matchesSearch;
    });
  }, [notifications, filter, typeFilter, search]);

  useEffect(() => {
    loadProfileAndNotifications();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = subscribeToNotifications(profile, () => {
      loadNotifications(false);
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profile?.id, profile?.role]);

  async function loadProfileAndNotifications() {
    try {
      setLoading(true);
      setError("");

      const currentProfile = await getCurrentProfile();
      setProfile(currentProfile);

      if (!currentProfile?.id) {
        setNotifications([]);
        return;
      }

      const data = await getNotifications(currentProfile);
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications(showLoading = true) {
    try {
      if (!profile?.id) return;

      if (showLoading) setLoading(true);

      setError("");

      const data = await getNotifications(profile);
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenNotification(notification) {
    try {
      setSelectedNotification(notification);
      setDetailsModal(true);

      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
        await loadNotifications(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function closeDetailsModal() {
    setSelectedNotification(null);
    setDetailsModal(false);
  }

  async function handleGoToAction(notification = selectedNotification) {
    if (!notification) return;

    try {
      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
      }

      const url = getDefaultActionUrl(notification, profile);
      navigate(url);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open notification action.");
    }
  }

  async function handleMarkAsRead(notification) {
    try {
      setProcessing(notification.id);
      setError("");
      setMessage("");

      await markNotificationAsRead(notification.id);
      setMessage("Notification marked as read.");
      await loadNotifications(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark notification as read.");
    } finally {
      setProcessing("");
    }
  }

  async function handleMarkAllRead() {
    try {
      setProcessing("mark-all");
      setError("");
      setMessage("");

      await markAllNotificationsAsRead(profile);
      setMessage("All notifications marked as read.");
      await loadNotifications(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setProcessing("");
    }
  }

  async function handleDelete(notification) {
    try {
      setProcessing(notification.id);
      setError("");
      setMessage("");

      await deleteNotification(notification.id);
      setMessage("Notification deleted.");
      await loadNotifications(false);

      if (selectedNotification?.id === notification.id) {
        closeDetailsModal();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete notification.");
    } finally {
      setProcessing("");
    }
  }

  async function handleClearRead() {
    try {
      setProcessing("clear-read");
      setError("");
      setMessage("");

      await clearReadNotifications(profile);
      setMessage("Read notifications cleared.");
      await loadNotifications(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to clear read notifications.");
    } finally {
      setProcessing("");
    }
  }

  function resetFilters() {
    setFilter("all");
    setTypeFilter("all");
    setSearch("");
  }

  return (
    <div className="page-shell">
      <Sidebar role={getSidebarRole(profile?.role)} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Notifications" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {getRoleLabel(profile?.role)} Notification Center
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Real-time system alerts and updates.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Track booking, payment, maintenance, and system notifications.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <HeroStat label="Total" value={notifications.length} />
                <HeroStat label="Unread" value={unreadCount} />
                <HeroStat label="Shown" value={filteredNotifications.length} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Notification Filters
                </h3>

                <p className="text-sm text-slate-500">
                  Filter unread alerts, notification type, or search by keyword.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={processing === "mark-all" || unreadCount === 0}
                  className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing === "mark-all" ? "Updating..." : "Mark All Read"}
                </button>

                <button
                  type="button"
                  onClick={handleClearRead}
                  disabled={processing === "clear-read"}
                  className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing === "clear-read" ? "Clearing..." : "Clear Read"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, message, type, or details"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <FilterSelect
                label="Read Status"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "unread", label: "Unread" },
                  { value: "read", label: "Read" },
                ]}
              />

              <FilterSelect
                label="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All" },
                  ...notificationTypes.map((type) => ({
                    value: type,
                    label: formatStatusLabel(type),
                  })),
                ]}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Notification Inbox
                </h3>

                <p className="text-sm text-slate-500">
                  Click a notification to view details and open its related page.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {filteredNotifications.length} shown
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading notifications...</p>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No notifications found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    processing={processing === notification.id}
                    onOpen={() => handleOpenNotification(notification)}
                    onRead={() => handleMarkAsRead(notification)}
                    onDelete={() => handleDelete(notification)}
                    onAction={() => handleGoToAction(notification)}
                  />
                ))}
              </div>
            )}
          </section>

          {detailsModal && selectedNotification && (
            <NotificationDetailsModal
              notification={selectedNotification}
              profile={profile}
              processing={processing === selectedNotification.id}
              onClose={closeDetailsModal}
              onAction={() => handleGoToAction(selectedNotification)}
              onDelete={() => handleDelete(selectedNotification)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function NotificationCard({
  notification,
  processing,
  onOpen,
  onRead,
  onDelete,
  onAction,
}) {
  const tone = getNotificationTone(notification.type);

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        notification.is_read
          ? "border-[#DED8D2] bg-white"
          : `${tone.border} bg-[#FFFDFC] shadow-sm`
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <span
            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
              notification.is_read ? "bg-slate-300" : tone.dot
            }`}
          ></span>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {!notification.is_read && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">
                  Unread
                </span>
              )}

              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone.badge}`}
              >
                {formatStatusLabel(notification.type)}
              </span>
            </div>

            <h4 className="text-lg font-black text-[#2B2B2B]">
              {notification.title || "Notification"}
            </h4>

            <p className="mt-1 text-sm text-slate-600">
              {notification.message || "You have a new notification."}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-400">
              {formatDateTime(notification.created_at)}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onAction}
            className="rounded-2xl bg-[#C97B6C] px-4 py-2 text-sm font-bold text-white hover:bg-[#B87463]"
          >
            Open
          </button>

          {!notification.is_read && (
            <button
              type="button"
              onClick={onRead}
              disabled={processing}
              className="rounded-2xl border border-[#DED8D2] px-4 py-2 text-sm font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
            >
              Read
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={processing}
            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationDetailsModal({
  notification,
  profile,
  processing,
  onClose,
  onAction,
  onDelete,
}) {
  const tone = getNotificationTone(notification.type);
  const metadata = notification.metadata || {};
  const isStaffOrAdmin = ["staff", "admin"].includes(
    String(profile?.role || "").toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Notification Details
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              {notification.title || "Notification"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone.badge}`}
              >
                {formatStatusLabel(notification.type)}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                  notification.is_read
                    ? "bg-slate-100 text-slate-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {notification.is_read ? "Read" : "Unread"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-[#F5F3F1] p-4">
          <p className="text-sm font-black text-[#2B2B2B]">Message</p>

          <p className="mt-2 text-sm text-slate-600">
            {notification.message || "You have a new notification."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Created At" value={formatDateTime(notification.created_at)} />
          <DetailItem label="Reference Type" value={notification.reference_type || "-"} />
          <DetailItem label="Reference ID" value={notification.reference_id || "-"} />
          <DetailItem label="Action URL" value={notification.action_url || "-"} />
          <DetailItem label="Facility" value={getMetadataValue(metadata, "facility_name")} />
          <DetailItem label="Booking Date" value={getMetadataValue(metadata, "booking_date")} />
          <DetailItem label="Start Time" value={getMetadataValue(metadata, "start_time")} />
          <DetailItem label="End Time" value={getMetadataValue(metadata, "end_time")} />
          <DetailItem label="Amount Paid" value={getMetadataValue(metadata, "amount_paid")} />
          <DetailItem label="Receipt Number" value={getMetadataValue(metadata, "receipt_number")} />

          {isStaffOrAdmin && (
            <DetailItem
              label="Customer"
              value={getMetadataValue(metadata, "customer_name")}
            />
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-[#2B2B2B]">Metadata</p>

          <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl bg-white p-4 text-xs text-slate-700">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onDelete}
            disabled={processing}
            className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>

          <button
            type="button"
            onClick={onAction}
            disabled={processing}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:opacity-60"
          >
            Open Related Page
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-[#2B2B2B]">
        {String(value || "-")}
      </p>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}