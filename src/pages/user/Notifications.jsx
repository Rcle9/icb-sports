import { useEffect, useRef, useState } from "react";
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

export default function Notifications({ forcedRole }) {
  const navigate = useNavigate();
  const channelRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");
  const [notifications, setNotifications] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const currentProfile = await getCurrentProfile();
        if (!currentProfile || !mounted) return;

        const activeRole = normalizeRole(
          forcedRole || currentProfile.role || "user"
        );

        const normalizedProfile = {
          ...currentProfile,
          role: activeRole,
        };

        setProfile(normalizedProfile);
        setRole(activeRole);

        await loadNotifications(currentProfile.id, activeRole);

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
              await loadNotifications(currentProfile.id, activeRole);
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.error("Notifications load error:", err.message);
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

  async function loadNotifications(userId, activeRole) {
    setLoading(true);

    const safeRole = normalizeRole(activeRole);
    const items = await getUserNotifications(userId, safeRole);

    setNotifications(items || []);
    await loadBookingDetails(items || []);

    setLoading(false);
  }

  async function loadBookingDetails(items) {
    const bookingIds = items
      .filter((item) => item.reference_id)
      .map((item) => item.reference_id);

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
          email,
          role
        )
      `
      )
      .in("id", uniqueIds);

    if (error) {
      console.error("Booking details error:", error.message);
      return;
    }

    const mapped = {};

    (data || []).forEach((booking) => {
      mapped[booking.id] = booking;
    });

    setBookingDetails(mapped);
  }

  function getNotificationRedirect(item) {
    if (!item?.reference_id) {
      if (role === "staff") return "/staff/notifications";
      if (role === "admin") return "/admin/reports";
      return "/notifications";
    }

    if (role === "staff") {
      return `/staff/bookings?highlight=${item.reference_id}`;
    }

    if (role === "admin") {
      return `/admin/reports?highlight=${item.reference_id}`;
    }

    return `/my-bookings?highlight=${item.reference_id}`;
  }

  async function handleNotificationClick(item) {
    await markAsRead(item.id);
    navigate(getNotificationRedirect(item));
  }

  async function handleMarkAllAsRead() {
    if (!profile?.id) return;

    await markAllAsRead(profile.id, role);
    await loadNotifications(profile.id, role);
  }

  return (
    <div className="page-shell">
      <Sidebar role={role} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Notifications" />

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {role === "staff"
                    ? "Staff Notifications"
                    : role === "admin"
                    ? "Admin Notifications"
                    : "My Notifications"}
                </h2>

                <p className="text-sm text-slate-500">
                  Showing {role} notifications with facility booking details.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-bold text-white hover:bg-[#B96A5D]"
              >
                Mark All as Read
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="text-slate-500">No notifications yet.</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((item) => {
                  const booking = bookingDetails[item.reference_id];

                  const totalHours = Number(booking?.total_hours || 0);
                  const facilityRate = Number(booking?.rate_per_hour || 0);
                  const facilityTotal = facilityRate * totalHours;

                  const finalTotal =
                    Number(booking?.total_amount || 0) || facilityTotal;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNotificationClick(item)}
                      className={`w-full rounded-2xl border p-5 text-left transition hover:bg-slate-50 ${
                        item.is_read
                          ? "border-slate-200 bg-white"
                          : "border-blue-200 bg-[#F3E4DF]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="w-full">
                          <h3 className="text-lg font-black text-slate-950">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            {item.message}
                          </p>

                          {booking && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                              <p className="text-base font-black text-slate-950">
                                {booking.facilities?.name || "Facility Booking"}
                              </p>

                              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                                <p>
                                  <b>Date:</b> {booking.booking_date || "-"}
                                </p>

                                <p>
                                  <b>Time:</b>{" "}
                                  {formatTime(booking.start_time)} -{" "}
                                  {formatTime(booking.end_time)}
                                </p>

                                <p>
                                  <b>Status:</b>{" "}
                                  <span className="capitalize">
                                    {booking.status || "-"}
                                  </span>
                                </p>

                                <p>
                                  <b>Session Type:</b>{" "}
                                  <span className="capitalize">
                                    {booking.session_type || "-"}
                                  </span>
                                </p>

                                <p>
                                  <b>Total Hours:</b> {totalHours} hour(s)
                                </p>

                                <p>
                                  <b>Facility Rate:</b> {money(facilityRate)} /
                                  hour
                                </p>

                                <p>
                                  <b>Facility Total:</b>{" "}
                                  {money(facilityTotal)}
                                </p>

                                {role !== "user" && (
                                  <p>
                                    <b>Requested By:</b>{" "}
                                    {booking.profiles?.full_name ||
                                      booking.profiles?.email ||
                                      "User"}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 rounded-2xl bg-white p-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-bold text-slate-700">
                                    Final Total
                                  </span>

                                  <span className="text-lg font-black text-[#C97B6C]">
                                    {money(finalTotal)}
                                  </span>
                                </div>
                              </div>

                              {booking.notes && (
                                <p className="mt-3 text-sm text-slate-600">
                                  <b>Notes:</b> {booking.notes}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="mt-3 text-xs capitalize text-slate-400">
                            Type: {item.type || "general"} • Role:{" "}
                            {item.target_role || role}
                          </p>
                        </div>

                        <div className="text-right">
                          {!item.is_read && (
                            <span className="mb-2 inline-block h-3 w-3 rounded-full bg-red-500" />
                          )}

                          <p className="text-xs text-slate-400">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}