import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAsRead,
} from "../../services/notificationService";

export default function Topbar({ title = "Dashboard" }) {
  const { user, profile } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const dropdownRef = useRef(null);

  const displayName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "User";

  const notificationPath =
    profile?.role === "admin"
      ? "/admin/notifications"
      : profile?.role === "staff"
      ? "/staff/notifications"
      : "/notifications";

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
      loadRecentNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`topbar-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          setRecentNotifications((prev) => [payload.new, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadUnreadCount() {
    try {
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error(error.message);
    }
  }

  async function loadRecentNotifications() {
    try {
      setLoadingPreview(true);
      const data = await getUserNotifications(user.id);
      setRecentNotifications((data || []).slice(0, 5));
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleNotificationClick(notificationId, isRead) {
    if (!isRead) {
      await markAsRead(notificationId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecentNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  return (
    <div className="topbar-card">
      <div className="relative rounded-[28px] border border-white/70 bg-white/90 px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-600">
              {getGreeting()}, {displayName}
            </p>

            <h1 className="mt-1 break-words text-3xl font-black tracking-tight text-black">
              {title}
            </h1>

            <p className="mt-2 text-sm text-slate-700">
              Welcome to InCredoBall Sports Management System.
            </p>
          </div>

          <div className="flex items-center gap-3" ref={dropdownRef}>
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 text-sm font-black text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)]">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-[120px]">
                <p className="truncate text-sm font-bold text-black">
                  {profile?.full_name || "Account"}
                </p>
                <p className="truncate text-xs capitalize text-slate-600">
                  {profile?.role || "user"}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                🔔

                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white ring-4 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {dropdownOpen ? (
                <div className="modal-card absolute right-0 z-50 mt-4 w-[380px] max-w-[90vw] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <h3 className="text-base font-black text-black">
                        Notifications
                      </h3>
                      <p className="text-xs text-slate-600">
                        {unreadCount} unread alert(s)
                      </p>
                    </div>

                    <Link
                      to={notificationPath}
                      onClick={() => setDropdownOpen(false)}
                      className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto">
                    {loadingPreview ? (
                      <div className="px-5 py-6 text-sm text-black">
                        Loading notifications...
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-slate-600">
                        No notifications yet.
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <Link
                          key={notification.id}
                          to={notificationPath}
                          onClick={() => {
                            handleNotificationClick(
                              notification.id,
                              notification.is_read
                            );
                            setDropdownOpen(false);
                          }}
                          className={`block border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50 ${
                            notification.is_read ? "bg-white" : "bg-blue-50/70"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                              🔔
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-black">
                                {notification.title}
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                                {notification.message}
                              </p>

                              <p className="mt-2 text-[11px] font-medium text-slate-500">
                                {new Date(
                                  notification.created_at
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Link>
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