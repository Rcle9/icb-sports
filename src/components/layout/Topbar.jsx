import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Clock,
  Menu,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";

  return "User";
}

function getRoleHome(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "/admin/dashboard";
  if (value === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function getRoleSubtitle(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "Administrative control center";
  if (value === "staff") return "Facility operations workspace";

  return "Customer booking portal";
}

function getInitials(name, email) {
  const cleanName = String(name || "").trim();

  if (cleanName) {
    const parts = cleanName.split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  }

  return String(email || "U").slice(0, 2).toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function getNotificationActionPath(notification) {
  const referenceId = notification?.reference_id;
  const referenceType = String(notification?.reference_type || "").toLowerCase();
  const type = String(notification?.type || "").toLowerCase();

  if (notification?.action_url) return notification.action_url;

  if (referenceId && referenceType === "bookings") {
    if (
      type === "booking_reserved" ||
      type === "payment_rejected" ||
      type === "reservation_expired"
    ) {
      return `/my-bookings?highlight=${referenceId}&pay=1`;
    }

    return `/my-bookings?highlight=${referenceId}`;
  }

  return "/notifications";
}

export default function Topbar({ title = "Dashboard", subtitle = "" }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const { user, profile } = useAuth();
  const { openSidebar } = useSidebar();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const displayName = useMemo(() => {
    return (
      profile?.full_name ||
      profile?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [profile, user]);

  const roleLabel = formatRole(profile?.role);
  const roleHome = getRoleHome(profile?.role);

  const finalSubtitle = subtitle || getRoleSubtitle(profile?.role);

  useEffect(() => {
    if (!user?.id) return;

    loadUnreadCount();
    loadRecentNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`topbar-notifications-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRecentNotifications((prev) => [payload.new, ...prev].slice(0, 5));

          if (!payload.new?.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
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
        () => {
          loadUnreadCount();
          loadRecentNotifications(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount();
          loadRecentNotifications(false);
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function loadUnreadCount() {
    try {
      if (!user?.id) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Failed to load unread notification count:", error.message);
    }
  }

  async function loadRecentNotifications(showLoading = true) {
    try {
      if (!user?.id) return;

      if (showLoading) setLoadingPreview(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

      if (error) throw error;

      setRecentNotifications(data || []);
    } catch (error) {
      console.error("Failed to load notification preview:", error.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function markNotificationAsRead(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw error;
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification?.id) return;

      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);

        setRecentNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setDropdownOpen(false);
      navigate(getNotificationActionPath(notification));
    } catch (error) {
      console.error("Failed to open notification:", error.message);
      setDropdownOpen(false);
      navigate("/notifications");
    }
  }

  async function handleRefreshNotifications() {
    await loadUnreadCount();
    await loadRecentNotifications();
  }

  return (
    <header className="mb-6 lg:mb-8">
      <div className="icb-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={openSidebar}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                  {getGreeting()}, {displayName.split(" ")[0]}
                </p>

                <span className="hidden rounded-full bg-[#F3E4DF] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#B86658] sm:inline-flex">
                  {roleLabel}
                </span>
              </div>

              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-[#0B1F33] sm:text-3xl">
                {title}
              </h1>

              <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                {finalSubtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3" ref={dropdownRef}>
            <Link
              to="/profile-settings"
              className="hidden items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] px-3 py-2 transition hover:bg-[#F3E4DF] md:flex"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1F33] text-sm font-black text-white">
                {getInitials(displayName, user?.email)}
              </div>

              <div className="min-w-0 text-left">
                <p className="max-w-[160px] truncate text-sm font-black text-[#0B1F33]">
                  {displayName}
                </p>

                <p className="text-xs font-bold text-slate-500">
                  {roleLabel} Account
                </p>
              </div>
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658]"
                title="Notifications"
              >
                <Bell size={21} />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-[800] mt-3 w-[360px] max-w-[88vw] overflow-hidden rounded-[28px] border border-[#DED8D2] bg-white shadow-[0_24px_70px_rgba(11,31,51,0.16)]">
                  <div className="flex items-start justify-between gap-4 border-b border-[#DED8D2] px-5 py-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                        Notifications
                      </p>

                      <h3 className="mt-1 text-lg font-black text-[#0B1F33]">
                        Recent updates
                      </h3>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {unreadCount} unread notification
                        {unreadCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshNotifications}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658]"
                      title="Refresh notifications"
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {loadingPreview ? (
                      <div className="px-5 py-6 text-sm font-semibold text-slate-500">
                        Loading notifications...
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                          <Bell size={22} />
                        </div>

                        <p className="mt-3 text-sm font-black text-[#0B1F33]">
                          No notifications yet
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Booking and payment updates will appear here.
                        </p>
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`block w-full border-b border-[#DED8D2] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#FBFAF9] ${
                            notification.is_read ? "bg-white" : "bg-[#FFF8F6]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                                notification.is_read
                                  ? "bg-slate-300"
                                  : "bg-red-600"
                              }`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="line-clamp-1 text-sm font-black text-[#0B1F33]">
                                  {notification.title || "Notification"}
                                </p>

                                <ChevronRight
                                  size={16}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />
                              </div>

                              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                                {notification.message ||
                                  "You have a new notification."}
                              </p>

                              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                <Clock size={13} />
                                {formatDateTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-[#DED8D2] bg-[#FBFAF9] px-5 py-4">
                    <Link
                      to="/notifications"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#B86658]"
                    >
                      View All Notifications
                      <ChevronRight size={17} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate("/profile-settings")}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DED8D2] bg-[#0B1F33] text-white transition hover:bg-[#102A43] md:hidden"
              title="Profile"
            >
              <UserRound size={21} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#DED8D2] pt-4 text-xs font-bold text-slate-500">
          <Link
            to={roleHome}
            className="text-[#C97B6C] transition hover:text-[#B86658]"
          >
            Home
          </Link>

          <span>/</span>

          <span className="text-[#0B1F33]">{title}</span>
        </div>
      </div>
    </header>
  );
}