import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import {
  getCurrentProfile,
  getUserNotifications,
  getUnreadNotificationCount,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";

export default function Topbar({ title = "Dashboard" }) {
  const navigate = useNavigate();
  const channelRef = useRef(null);
  const intervalRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initTopbar() {
      const currentProfile = await getCurrentProfile();
      if (!currentProfile || !mounted) return;

      setProfile(currentProfile);
      await refreshNotifications(currentProfile.id, currentProfile.role, mounted);

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`notifications-live-${currentProfile.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentProfile.id}`,
          },
          async () => {
            await refreshNotifications(
              currentProfile.id,
              currentProfile.role,
              mounted
            );
          }
        )
        .subscribe();

      channelRef.current = channel;

      intervalRef.current = setInterval(async () => {
        await refreshNotifications(
          currentProfile.id,
          currentProfile.role,
          mounted
        );
      }, 5000);
    }

    initTopbar();

    return () => {
      mounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  async function refreshNotifications(userId, role, mounted = true) {
    try {
      const [items, count] = await Promise.all([
        getUserNotifications(userId, role),
        getUnreadNotificationCount(userId, role),
      ]);

      if (!mounted) return;

      setNotifications(items || []);
      setUnreadCount(count || 0);
    } catch (err) {
      console.error("Notification refresh error:", err.message);
    }
  }

  function getNotificationPage() {
    if (profile?.role === "staff") return "/staff/notifications";
    if (profile?.role === "admin") return "/admin/notifications";
    return "/notifications";
  }

  async function handleViewAll() {
    if (!profile?.id) return;

    await markAllAsRead(profile.id, profile.role);
    await refreshNotifications(profile.id, profile.role);

    setOpen(false);
    navigate(getNotificationPage());
  }

  async function handleNotificationClick(item) {
    if (!profile?.id) return;

    await markAsRead(item.id);
    await refreshNotifications(profile.id, profile.role);

    setOpen(false);

    if (
      (item.type === "booking_request" || item.type === "booking") &&
      item.reference_id
    ) {
      if (profile.role === "staff") {
        navigate(`/staff/bookings?highlight=${item.reference_id}`);
        return;
      }

      if (profile.role === "admin") {
        navigate(`/admin/reports?highlight=${item.reference_id}`);
        return;
      }
    }

    if (item.type === "booking_update" && item.reference_id) {
      navigate(`/booking?highlight=${item.reference_id}`);
      return;
    }

    navigate(getNotificationPage());
  }

  return (
    <div className="relative mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#C97B6C]">
            Good day, {profile?.full_name || "User"}
          </p>

          <h1 className="text-3xl font-black text-[#2B2B2B]">{title}</h1>

          <p className="mt-1 text-sm text-slate-600">
            Welcome to InCredoBall Sports Management System.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-2xl border border-[#DED8D2] bg-white px-5 py-3 shadow-sm md:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C97B6C] font-bold text-white">
              {(profile?.full_name || "U").charAt(0)}
            </div>

            <div>
              <p className="text-sm font-bold text-[#2B2B2B]">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {profile?.role || "user"}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                setOpen((prev) => !prev);
                if (profile?.id) {
                  await refreshNotifications(profile.id, profile.role);
                }
              }}
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-xl shadow-sm transition hover:bg-[#F3E4DF]"
            >
              🔔

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#C65B5B] px-1 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-16 z-50 w-[380px] overflow-hidden rounded-3xl border border-[#DED8D2] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#DED8D2] px-5 py-4">
                  <div>
                    <h3 className="text-lg font-black text-[#2B2B2B]">
                      Notifications
                    </h3>
                    <p className="text-sm text-slate-500">
                      {unreadCount} unread
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="text-sm font-bold text-[#C97B6C] hover:text-[#D88E80]"
                  >
                    View all
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`relative block w-full border-b border-[#DED8D2] px-5 py-4 text-left transition hover:bg-[#F3E4DF] ${
                          item.is_read ? "bg-white" : "bg-[#F3E4DF]"
                        }`}
                      >
                        {!item.is_read && (
                          <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-[#C65B5B]" />
                        )}

                        <h4 className="pr-8 text-sm font-black text-[#2B2B2B]">
                          {item.title}
                        </h4>

                        <p className="mt-1 pr-8 text-sm text-slate-700">
                          {item.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}