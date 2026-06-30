import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  getUserNotifications,
  markAllAsRead,
  markAsRead,
} from "../../services/notificationService";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "coach") return "user";
  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
}

function roleFromPath(pathname, profileRole) {
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/admin")) return "admin";

  return normalizeRole(profileRole);
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time24) {
  if (!time24) return "-";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
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

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getNotificationBookingId(notification) {
  const metadata = notification?.metadata || {};

  return (
    metadata.booking_id ||
    metadata.reference_id ||
    notification?.reference_id ||
    notification?.booking_id ||
    null
  );
}

function getNotificationRedirect(notification, role) {
  const cleanRole = normalizeRole(role);
  const bookingId = getNotificationBookingId(notification);

  if (!bookingId) {
    if (cleanRole === "staff") return "/staff/notifications";
    if (cleanRole === "admin") return "/admin/notifications";
    return "/notifications";
  }

  if (cleanRole === "staff") {
    return `/staff/bookings?highlight=${bookingId}`;
  }

  if (cleanRole === "admin") {
    return `/staff/bookings?highlight=${bookingId}`;
  }

  return `/my-bookings?highlight=${bookingId}`;
}

function notificationTypeClass(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("verified") || value.includes("approved")) {
    return "bg-green-100 text-green-700";
  }

  if (value.includes("rejected")) {
    return "bg-red-100 text-red-700";
  }

  if (value.includes("expired")) {
    return "bg-orange-100 text-orange-700";
  }

  if (value.includes("payment")) {
    return "bg-yellow-100 text-yellow-700";
  }

  if (value.includes("cancelled")) {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-blue-100 text-blue-700";
}

function bookingStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

export default function Notifications() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = roleFromPath(location.pathname, profile?.role);

  const [notifications, setNotifications] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const bookingId = getNotificationBookingId(item);
      const booking = bookingDetails[bookingId];

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !item.is_read) ||
        (filter === "read" && item.is_read) ||
        String(item.type || "").toLowerCase().includes(filter);

      const searchText = [
        item.title,
        item.message,
        item.type,
        item.created_at,
        booking?.facilities?.name,
        booking?.profiles?.full_name,
        booking?.booking_date,
        booking?.status,
        booking?.payment_status,
        booking?.payment_reference,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [notifications, bookingDetails, filter, search]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((item) => !item.is_read).length,
      payment: notifications.filter((item) =>
        String(item.type || "").toLowerCase().includes("payment")
      ).length,
      expired: notifications.filter((item) =>
        String(item.type || "").toLowerCase().includes("expired")
      ).length,
    };
  }, [notifications]);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, role]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-page-${user.id}-${role}-${Date.now()}`)
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
  }, [user?.id, role]);

  async function loadNotifications(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const data = await getUserNotifications(user.id, role, 100);
      setNotifications(data || []);

      await loadBookingDetails(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBookingDetails(items) {
    const bookingIds = items
      .map((item) => getNotificationBookingId(item))
      .filter(Boolean);

    const uniqueIds = [...new Set(bookingIds)];

    if (uniqueIds.length === 0) {
      setBookingDetails({});
      return;
    }

    const { data, error } = await supabase
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

    if (error) {
      console.error("Booking details error:", error.message);
      setBookingDetails({});
      return;
    }

    const mapped = {};

    (data || []).forEach((booking) => {
      mapped[booking.id] = booking;
    });

    setBookingDetails(mapped);
  }

  async function handleNotificationClick(item) {
    try {
      setError("");
      setMessage("");

      if (!item.is_read) {
        await markAsRead(item.id);
      }

      navigate(getNotificationRedirect(item, role));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open notification.");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setError("");
      setMessage("");

      await markAllAsRead(user.id, role);
      await loadNotifications(false);

      setMessage("All notifications marked as read.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark notifications as read.");
    }
  }

  function resetFilters() {
    setFilter("all");
    setSearch("");
  }

  return (
    <div className="page-shell">
      <Sidebar role={role} />

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
                  {role === "staff"
                    ? "Staff Notifications"
                    : role === "admin"
                    ? "Admin Notifications"
                    : "My Notifications"}
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Stay updated with booking and payment activity.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Notifications include reservations, payment verification,
                  approvals, rejections, cancellations, and expired bookings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Total" value={stats.total} />
                <HeroStat label="Unread" value={stats.unread} />
                <HeroStat label="Payment" value={stats.payment} />
                <HeroStat label="Expired" value={stats.expired} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_auto_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, message, facility, customer, status, date, or reference"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Filter
                </label>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="payment">Payment</option>
                  <option value="expired">Expired</option>
                  <option value="reserved">Reserved</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
                >
                  Mark All Read
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Notification List
                </h3>

                <p className="text-sm text-slate-500">
                  Click a notification to open the related booking.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {filteredNotifications.length} shown
              </span>
            </div>

            {loading ? (
              <p className="text-slate-500">Loading notifications...</p>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No notifications found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((item) => {
                  const bookingId = getNotificationBookingId(item);
                  const booking = bookingDetails[bookingId];

                  return (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      booking={booking}
                      role={role}
                      onOpen={() => handleNotificationClick(item)}
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

function NotificationCard({ item, booking, role, onOpen }) {
  const bookingStatus = booking?.status || "";
  const paymentStatus = booking?.payment_status || "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`block w-full rounded-2xl border p-5 text-left transition hover:border-[#C97B6C] hover:bg-[#FFF8F5] ${
        item.is_read
          ? "border-[#DED8D2] bg-white"
          : "border-[#C97B6C] bg-[#FFF6F3] shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {!item.is_read && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">
                Unread
              </span>
            )}

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${notificationTypeClass(
                item.type
              )}`}
            >
              {formatStatusLabel(item.type)}
            </span>

            {bookingStatus && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${bookingStatusClass(
                  bookingStatus
                )}`}
              >
                Booking: {formatStatusLabel(bookingStatus)}
              </span>
            )}

            {paymentStatus && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(
                  paymentStatus
                )}`}
              >
                Payment: {formatStatusLabel(paymentStatus)}
              </span>
            )}
          </div>

          <h4 className="text-lg font-black text-[#2B2B2B]">{item.title}</h4>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {item.message}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            {formatDateTime(item.created_at)}
          </p>

          {booking ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-[#2B2B2B]">
                {booking.facilities?.name || "Facility Booking"}
              </p>

              {role !== "user" && (
                <p className="mt-1 text-sm text-slate-600">
                  Customer:{" "}
                  <b>{booking.profiles?.full_name || "Unknown User"}</b>
                </p>
              )}

              <p className="mt-1 text-sm text-slate-600">
                {formatDate(booking.booking_date)} •{" "}
                {formatTime(booking.start_time)} -{" "}
                {formatTime(booking.end_time)}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <MiniDetail label="Total" value={money(booking.total_amount)} />
                <MiniDetail label="Paid" value={money(booking.amount_paid)} />
                <MiniDetail
                  label="Reference"
                  value={booking.payment_reference || "-"}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Booking details are not available or may have been removed.
            </div>
          )}
        </div>

        <div className="shrink-0">
          <span className="inline-flex rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-bold text-white">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-[#2B2B2B]">
        {value}
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