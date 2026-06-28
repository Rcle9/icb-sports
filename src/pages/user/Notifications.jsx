import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  getCurrentProfile,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
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

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

function getNotificationIcon(type, status) {
  const cleanType = String(type || "").toLowerCase();
  const cleanStatus = normalizeStatus(status);

  if (cleanStatus === "approved") return "✓";
  if (cleanStatus === "rejected") return "!";
  if (cleanStatus === "cancelled") return "×";
  if (cleanType.includes("booking")) return "📅";

  return "🔔";
}

function getNotificationTitle(role) {
  if (role === "staff") return "Staff Notifications";
  if (role === "admin") return "Admin Notifications";

  return "My Notifications";
}

function getNotificationDescription(role) {
  if (role === "staff") {
    return "Review booking requests, booking updates, and operational notifications.";
  }

  if (role === "admin") {
    return "Monitor system notifications, booking activity, and admin-related updates.";
  }

  return "Track your booking approvals, rejections, cancellations, and account updates.";
}

function getBookingTitle(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getRequesterName(booking) {
  return booking?.profiles?.full_name || "User";
}

function getFinalTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const rate = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * rate;

  return Number(booking?.total_amount || 0) || computed;
}

export default function Notifications({ forcedRole }) {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");
  const [notifications, setNotifications] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        setError("");

        const currentProfile = await getCurrentProfile();
        if (!currentProfile || !mounted) return;

        const activeRole = normalizeRole(forcedRole || currentProfile.role || "user");

        const normalizedProfile = {
          ...currentProfile,
          role: activeRole,
        };

        setProfile(normalizedProfile);
        setRole(activeRole);

        await loadNotifications(currentProfile.id, activeRole, mounted);

        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channel = supabase
          .channel(`notifications-page-${currentProfile.id}-${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${currentProfile.id}`,
            },
            async () => {
              await loadNotifications(currentProfile.id, activeRole, mounted);
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.error("Notifications load error:", err.message);

        if (mounted) {
          setError(err.message || "Failed to load notifications.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [forcedRole]);

  async function loadNotifications(userId, activeRole, mounted = true) {
    try {
      if (!userId) return;

      const safeRole = normalizeRole(activeRole);
      const items = await getUserNotifications(userId, safeRole);

      if (!mounted) return;

      setNotifications(items || []);
      await loadBookingDetails(items || [], mounted);
    } catch (err) {
      console.error("Load notifications error:", err.message);

      if (mounted) {
        setError(err.message || "Failed to load notifications.");
      }
    }
  }

  async function loadBookingDetails(items, mounted = true) {
    const bookingIds = items
      .filter((item) => item.reference_id)
      .map((item) => item.reference_id);

    const uniqueIds = [...new Set(bookingIds)];

    if (uniqueIds.length === 0) {
      if (mounted) setBookingDetails({});
      return;
    }

    const { data, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        facilities (*),
        profiles:user_id (
          id,
          full_name,
          role
        )
      `
      )
      .in("id", uniqueIds);

    if (bookingError) {
      console.error("Booking details error:", bookingError.message);
      return;
    }

    const mapped = {};

    (data || []).forEach((booking) => {
      mapped[booking.id] = booking;
    });

    if (mounted) setBookingDetails(mapped);
  }

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }

    if (activeFilter === "read") {
      return notifications.filter((item) => item.is_read);
    }

    if (activeFilter === "booking") {
      return notifications.filter((item) =>
        String(item.type || "").toLowerCase().includes("booking")
      );
    }

    return notifications;
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((item) => item.is_read).length;
  }, [notifications]);

  const bookingCount = useMemo(() => {
    return notifications.filter((item) =>
      String(item.type || "").toLowerCase().includes("booking")
    ).length;
  }, [notifications]);

  function getNotificationRedirect(item) {
    const referenceId = item?.reference_id;

    if (role === "staff") {
      if (referenceId) return `/staff/bookings?highlight=${referenceId}`;
      return "/staff/notifications";
    }

    if (role === "admin") {
      if (referenceId) return `/admin/reports?highlight=${referenceId}`;
      return "/admin/notifications";
    }

    if (referenceId) return `/my-bookings?highlight=${referenceId}`;
    return "/notifications";
  }

  async function handleNotificationClick(item) {
    try {
      if (!item.is_read) {
        await markAsRead(item.id);
      }

      navigate(getNotificationRedirect(item));
    } catch (err) {
      console.error("Notification click error:", err.message);
      navigate(getNotificationRedirect(item));
    }
  }

  async function handleMarkAllAsRead() {
    if (!profile?.id) return;

    try {
      setActionLoading(true);
      await markAllAsRead(profile.id, role);
      await loadNotifications(profile.id, role);
    } catch (err) {
      console.error("Mark all as read error:", err.message);
      setError(err.message || "Failed to mark notifications as read.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearRead() {
    if (!profile?.id) return;

    const confirmClear = window.confirm(
      "Clear all read notifications? Unread notifications will remain."
    );

    if (!confirmClear) return;

    try {
      setActionLoading(true);

      let query = supabase
        .from("notifications")
        .delete()
        .eq("user_id", profile.id)
        .eq("is_read", true);

      if (role) {
        query = query.or(`target_role.eq.${role},target_role.is.null`);
      }

      const { error: deleteError } = await query;

      if (deleteError) throw deleteError;

      await loadNotifications(profile.id, role);
    } catch (err) {
      console.error("Clear read notifications error:", err.message);
      setError(
        err.message ||
          "Failed to clear read notifications. Please check your notification RLS policy."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role={role} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Notifications" />

          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Notification Center</p>

                <h2 className="mt-3 text-4xl font-black">
                  {getNotificationTitle(role)}
                </h2>

                <p className="mt-4 max-w-3xl text-base text-white/90">
                  {getNotificationDescription(role)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NotificationStat label="All" value={notifications.length} />
                <NotificationStat label="Unread" value={unreadCount} />
                <NotificationStat label="Read" value={readCount} />
                <NotificationStat label="Booking" value={bookingCount} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="All"
                  active={activeFilter === "all"}
                  onClick={() => setActiveFilter("all")}
                />

                <FilterButton
                  label={`Unread (${unreadCount})`}
                  active={activeFilter === "unread"}
                  onClick={() => setActiveFilter("unread")}
                />

                <FilterButton
                  label={`Read (${readCount})`}
                  active={activeFilter === "read"}
                  onClick={() => setActiveFilter("read")}
                />

                <FilterButton
                  label={`Booking (${bookingCount})`}
                  active={activeFilter === "booking"}
                  onClick={() => setActiveFilter("booking")}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading || notifications.length === 0}
                  className="rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-bold text-white hover:bg-[#B96A5D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Please wait..." : "Mark All as Read"}
                </button>

                <button
                  type="button"
                  onClick={handleClearRead}
                  disabled={actionLoading || readCount === 0}
                  className="rounded-2xl border border-[#DED8D2] bg-white px-4 py-3 text-sm font-bold text-[#2B2B2B] hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear Read
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Notification List
                </h3>

                <p className="text-sm text-slate-500">
                  Click a notification to open its related page.
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-500">
                Showing {filteredNotifications.length} of {notifications.length}
              </p>
            </div>

            {loading ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Loading notifications...
              </p>
            ) : filteredNotifications.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                No notifications found.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((item) => {
                  const booking = bookingDetails[item.reference_id];

                  return (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      booking={booking}
                      role={role}
                      onClick={() => handleNotificationClick(item)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function NotificationCard({ item, booking, role, onClick }) {
  const status = normalizeStatus(booking?.status);
  const icon = getNotificationIcon(item.type, booking?.status);
  const finalTotal = getFinalTotal(booking);
  const totalHours = Number(booking?.total_hours || 0);
  const facilityRate = Number(booking?.rate_per_hour || 0);
  const facilityTotal = totalHours * facilityRate;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
        item.is_read
          ? "border-[#DED8D2] bg-white"
          : "border-[#C97B6C]/40 bg-[#FDF3EF]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
              item.is_read
                ? "bg-slate-100 text-slate-500"
                : "bg-[#C97B6C] text-white"
            }`}
          >
            {icon}
          </div>

          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-black text-[#2B2B2B]">
                {item.title || "Notification"}
              </h4>

              {!item.is_read && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-600">
                  Unread
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                {item.type || "general"}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.message || "No message provided."}
            </p>

            {booking ? (
              <div className="mt-4 rounded-2xl border border-[#DED8D2] bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-black text-[#2B2B2B]">
                      {getBookingTitle(booking)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(booking.booking_date)} •{" "}
                      {formatTime(booking.start_time)} -{" "}
                      {formatTime(booking.end_time)}
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

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <DetailItem
                    label="Session Type"
                    value={booking.session_type || "-"}
                  />

                  <DetailItem label="Total Hours" value={`${totalHours} hour(s)`} />

                  <DetailItem
                    label="Facility Rate"
                    value={`${money(facilityRate)} / hour`}
                  />

                  <DetailItem label="Facility Total" value={money(facilityTotal)} />

                  {role !== "user" && (
                    <DetailItem label="Requested By" value={getRequesterName(booking)} />
                  )}

                  <DetailItem label="Final Total" value={money(finalTotal)} strong />
                </div>

                {booking.notes ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    <b>Notes:</b> {booking.notes}
                  </p>
                ) : null}

                {status === "rejected" && booking.rejection_reason ? (
                  <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">
                    <b>Rejection Reason:</b> {booking.rejection_reason}
                  </p>
                ) : null}

                {status === "cancelled" && booking.cancellation_reason ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    <b>Cancellation Reason:</b> {booking.cancellation_reason}
                  </p>
                ) : null}
              </div>
            ) : item.reference_id ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#DED8D2] bg-slate-50 p-4 text-sm text-slate-500">
                Related booking details could not be loaded, but clicking this
                notification will still open the related page.
              </div>
            ) : null}

            <p className="mt-3 text-xs capitalize text-slate-400">
              Role: {item.target_role || role}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-left md:text-right">
          <p className="text-xs text-slate-400">
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </p>

          <p className="mt-2 text-xs font-bold text-[#C97B6C]">
            Click to open
          </p>
        </div>
      </div>
    </button>
  );
}

function NotificationStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-5 py-4 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-white/80">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-bold ${
        active
          ? "bg-[#C97B6C] text-white"
          : "bg-slate-100 text-[#2B2B2B] hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function DetailItem({ label, value, strong = false }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 capitalize ${
          strong ? "text-lg font-black text-[#C97B6C]" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}