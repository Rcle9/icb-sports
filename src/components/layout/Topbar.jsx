import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Menu, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import {
  getCurrentProfile,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "../../services/notificationService";

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getRoleHome(role) {
  const currentRole = String(role || "user").toLowerCase();

  if (currentRole === "admin") return "/admin/dashboard";
  if (currentRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function getRoleLabel(role) {
  const currentRole = String(role || "user").toLowerCase();

  if (currentRole === "admin") return "Administrator";
  if (currentRole === "staff") return "Staff";

  return "User";
}

function getInitials(name) {
  if (!name) return "U";

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getNotificationAction(notification, profile) {
  if (notification?.action_url) return notification.action_url;

  const type = String(notification?.type || "").toLowerCase();
  const role = String(profile?.role || "user").toLowerCase();

  if (role === "admin") {
    if (type.includes("payment")) return "/staff/manage-bookings";
    if (type.includes("booking")) return "/admin/command-center";
    if (type.includes("maintenance")) return "/admin/command-center";

    return "/notifications";
  }

  if (role === "staff") {
    if (type.includes("payment")) return "/staff/manage-bookings";
    if (type.includes("booking")) return "/staff/manage-bookings";
    if (type.includes("maintenance")) return "/staff/manage-bookings";

    return "/notifications";
  }

  if (type.includes("payment")) return "/my-bookings";
  if (type.includes("booking")) return "/my-bookings";

  return "/notifications";
}

export default function Topbar({ title = "Dashboard", onMenuClick }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    return notifications.slice(0, 6);
  }, [notifications]);

  useEffect(() => {
    let mounted = true;
    let channel = null;

    async function initializeTopbar() {
      try {
        const currentProfile = await getCurrentProfile();

        if (!mounted) return;

        setProfile(currentProfile);

        if (currentProfile?.id) {
          await loadNotifications(currentProfile);

          channel = subscribeToNotifications(currentProfile, async () => {
            await loadNotifications(currentProfile, false);
          });
        }
      } catch (err) {
        console.error("Topbar initialize error:", err);
      }
    }

    initializeTopbar();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!dropdownRef.current) return;

      if (!dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function loadNotifications(targetProfile = profile, showLoading = true) {
    try {
      if (!targetProfile?.id) return;

      if (showLoading) setLoadingNotifications(true);

      const data = await getNotifications(targetProfile);
      setNotifications(data || []);
    } catch (err) {
      console.error("loadNotifications error:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification?.id) return;

      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
      }

      setDropdownOpen(false);

      const actionUrl = getNotificationAction(notification, profile);

      await loadNotifications(profile, false);

      navigate(actionUrl);
    } catch (err) {
      console.error("handleNotificationClick error:", err);
    }
  }

  async function handleMarkAllRead() {
    try {
      if (!profile?.id) return;

      await markAllNotificationsAsRead(profile);
      await loadNotifications(profile, false);
    } catch (err) {
      console.error("handleMarkAllRead error:", err);
    }
  }

  function openNotificationsPage() {
    setDropdownOpen(false);
    navigate("/notifications");
  }

  function openProfileSettings() {
    navigate("/profile-settings");
  }

  function openHome() {
    navigate(getRoleHome(profile?.role));
  }

  return (
    <header className="sticky top-0 z-30 mb-6 rounded-[28px] border border-[#DED8D2] bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-2xl border border-[#DED8D2] p-3 text-[#2B2B2B] hover:bg-[#F5F3F1] lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}

          <button type="button" onClick={openHome} className="min-w-0 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-[#C97B6C]">
              {getRoleLabel(profile?.role)} Panel
            </p>

            <h1 className="mt-1 truncate text-2xl font-black text-[#2B2B2B]">
              {title}
            </h1>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="relative rounded-2xl border border-[#DED8D2] p-3 text-[#2B2B2B] hover:bg-[#F5F3F1]"
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-[340px] overflow-hidden rounded-[24px] border border-[#DED8D2] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#DED8D2] px-4 py-4">
                  <div>
                    <h3 className="text-sm font-black text-[#2B2B2B]">
                      Notifications
                    </h3>

                    <p className="text-xs text-slate-500">
                      {unreadCount} unread notification(s)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="rounded-xl border border-[#DED8D2] px-3 py-2 text-xs font-bold hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCheck size={14} />
                      Read All
                    </span>
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto p-2">
                  {loadingNotifications ? (
                    <p className="px-4 py-5 text-sm text-slate-500">
                      Loading notifications...
                    </p>
                  ) : visibleNotifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    visibleNotifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full rounded-2xl px-4 py-3 text-left transition hover:bg-[#F5F3F1] ${
                          !notification.is_read ? "bg-[#FFF7F4]" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              !notification.is_read
                                ? "bg-[#C97B6C]"
                                : "bg-slate-300"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-1 text-sm font-black text-[#2B2B2B]">
                              {notification.title || "Notification"}
                            </h4>

                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {notification.message || "You have a new update."}
                            </p>

                            <p className="mt-2 text-[11px] font-semibold text-slate-400">
                              {formatDateTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-[#DED8D2] p-3">
                  <button
                    type="button"
                    onClick={openNotificationsPage}
                    className="w-full rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openProfileSettings}
            className="hidden items-center gap-3 rounded-2xl border border-[#DED8D2] px-4 py-2.5 hover:bg-[#F5F3F1] sm:flex"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F3E4DF] text-sm font-black text-[#C97B6C]">
              {getInitials(profile?.full_name || profile?.name || profile?.email)}
            </span>

            <span className="max-w-[160px] text-left">
              <span className="block truncate text-sm font-black text-[#2B2B2B]">
                {profile?.full_name || profile?.name || "Account"}
              </span>

              <span className="block truncate text-xs font-semibold text-slate-500">
                {getRoleLabel(profile?.role)}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={openProfileSettings}
            className="rounded-2xl border border-[#DED8D2] p-3 text-[#2B2B2B] hover:bg-[#F5F3F1] sm:hidden"
          >
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}