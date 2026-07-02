import { useEffect, useMemo, useState } from "react";
import { Bell, Menu, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";

function getRoleHome(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";
  return "/dashboard";
}

function getNotificationPath(role) {
  if (role === "admin") return "/admin/notifications";
  if (role === "staff") return "/staff/notifications";
  return "/user/notifications";
}

function getProfilePath(role) {
  if (role === "admin") return "/admin/profile";
  if (role === "staff") return "/staff/profile";
  return "/user/profile";
}

function getRoleLabel(role) {
  if (role === "admin") return "Admin Control";
  if (role === "staff") return "Staff Workspace";
  return "Customer Portal";
}

export default function Topbar({
  title = "Dashboard",
  subtitle = "",
  actions = null,
}) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openSidebar } = useSidebar();

  const [unreadCount, setUnreadCount] = useState(0);

  const role = useMemo(() => {
    return profile?.role || "user";
  }, [profile?.role]);

  useEffect(() => {
    if (!user?.id) return;

    loadUnreadCount();

    const channel = supabase
      .channel(`topbar-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadUnreadCount() {
    try {
      if (!user?.id) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (err) {
      console.error("Failed to load unread notifications:", err);
      setUnreadCount(0);
    }
  }

  function goHome() {
    navigate(getRoleHome(role));
  }

  function goToNotifications() {
    navigate(getNotificationPath(role));
  }

  function goToProfile() {
    navigate(getProfilePath(role));
  }

  function TopbarContent({ mobile = false }) {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {mobile && (
              <button
                type="button"
                onClick={openSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658]"
                aria-label="Open sidebar menu"
              >
                <Menu size={21} />
              </button>
            )}

            <button type="button" onClick={goHome} className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="hidden h-2.5 w-2.5 rounded-full bg-[#C97B6C] sm:block" />

                <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#C97B6C]">
                  {subtitle || getRoleLabel(role)}
                </p>
              </div>

              <h1 className="mt-1 truncate text-xl font-black leading-tight text-[#0B1F33] sm:text-2xl lg:text-3xl">
                {title}
              </h1>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions && (
              <div className="hidden items-center gap-2 overflow-x-auto md:flex">
                {actions}
              </div>
            )}

            <button
              type="button"
              onClick={goToNotifications}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658] sm:h-12 sm:w-12"
              aria-label="Notifications"
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-black leading-none text-white shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={goToProfile}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] bg-[#0B1F33] text-white transition hover:bg-[#102A43] sm:h-12 sm:w-12"
              aria-label="Profile"
            >
              <UserRound size={20} />
            </button>
          </div>
        </div>

        {actions && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto md:hidden">
            {actions}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Mobile fixed topbar */}
      <div className="h-[94px] lg:hidden" />

      <header className="fixed left-4 right-4 top-3 z-[70] rounded-[24px] border border-[#DED8D2] bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(11,31,51,0.16)] backdrop-blur lg:hidden">
        <TopbarContent mobile />
      </header>

      {/* Desktop normal topbar */}
      <header className="mb-6 hidden w-full rounded-[28px] border border-[#DED8D2] bg-white px-6 py-5 shadow-[0_10px_28px_rgba(11,31,51,0.06)] lg:block">
        <TopbarContent />
      </header>
    </>
  );
}