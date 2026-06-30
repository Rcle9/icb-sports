import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAsRead,
} from "../../services/notificationService";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "coach") return "user";
  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
}

function getRoleTargets(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") return ["admin", "staff"];
  if (cleanRole === "staff") return ["staff"];

  return [];
}

function getNotificationPage(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "staff") return "/staff/notifications";
  if (cleanRole === "admin") return "/admin/notifications";

  return "/notifications";
}

function getNotificationRedirect(notification, role) {
  const cleanRole = normalizeRole(role);
  const metadata = notification?.metadata || {};
  const bookingId =
    metadata.booking_id ||
    metadata.reference_id ||
    notification?.reference_id ||
    notification?.booking_id ||
    null;

  if (!bookingId) {
    return getNotificationPage(cleanRole);
  }

  if (cleanRole === "staff") {
    return `/staff/bookings?highlight=${bookingId}`;
  }

  if (cleanRole === "admin") {
    return `/staff/bookings?highlight=${bookingId}`;
  }

  return `/my-bookings?highlight=${bookingId}`;
}

function formatNotificationTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function Topbar({ title = "Dashboard" }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const role = normalizeRole(profile?.role);
  const roleTargets = getRoleTargets(role);
  const notificationPath = getNotificationPage(role);

  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
      loadRecentNotifications();
    }
  }, [user?.id, role]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`topbar-notifications-${user.id}-${role}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await refreshNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await refreshNotifications();
        }
      );

    roleTargets.forEach((targetRole) => {
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `role=eq.${targetRole}`,
          },
          async () => {
            await refreshNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `role=eq.${targetRole}`,
          },
          async () => {
            await refreshNotifications();
          }
        );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function refreshNotifications() {
    await Promise.all([loadUnreadCount(), loadRecentNotifications()]);
  }

  async function loadUnreadCount() {
    try {
      if (!user?.id) return;

      const count = await getUnreadNotificationCount(user.id, role);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error.message);
    }
  }

  async function loadRecentNotifications() {
    try {
      if (!user?.id) return;

      setLoadingPreview(true);

      const data = await getUserNotifications(user.id, role, 10);
      setRecentNotifications((data || []).slice(0, 5));
    } catch (error) {
      console.error("Failed to load notification preview:", error.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification?.is_read) {
        await markAsRead(notification.id);

        setRecentNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setDropdownOpen(false);
      navigate(getNotificationRedirect(notification, role));
    } catch (error) {
      console.error("Failed to open notification:", error.message);
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
  }

  const displayName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  return (
    <div className="mb-8">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-600">
              {getGreeting()}, {displayName}
            </p>

            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-black">
              {title}
            </h1>

            <p className="mt-2 text-sm text-black">
              Welcome to InCredoBall Sports Management System.
            </p>
          </div>

          <div className="flex items-center gap-3" ref={dropdownRef}>
            <div className="hidden min-w-[180px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {profile?.full_name || "Account"}
                </p>

                <p className="truncate text-xs capitalize text-black">
                  {role}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
                title="Notifications"
              >
                <span className="text-xl">🔔</span>

                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 z-50 mt-3 w-[360px] max-w-[90vw] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <h3 className="font-semibold text-black">
                        Notifications
                      </h3>

                      <p className="text-xs text-black">
                        {unreadCount} unread
                      </p>
                    </div>

                    <Link
                      to={notificationPath}
                      onClick={() => setDropdownOpen(false)}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {loadingPreview ? (
                      <div className="px-4 py-6 text-sm text-black">
                        Loading notifications...
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-black">
                        No notifications yet.
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                            notification.is_read ? "bg-white" : "bg-blue-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-black">
                                {notification.title}
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs text-black">
                                {notification.message}
                              </p>

                              <p className="mt-2 text-[11px] text-black">
                                {formatNotificationTime(
                                  notification.created_at
                                )}
                              </p>
                            </div>

                            {!notification.is_read ? (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"></span>
                            ) : null}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}