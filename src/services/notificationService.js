import { supabase } from "./supabaseClient";

function normalizeRole(role) {
  const cleanRole = String(role || "").toLowerCase();

  if (cleanRole === "coach") return "user";

  return cleanRole;
}

function normalizeNotification(notification) {
  return {
    ...notification,
    target_role: normalizeRole(notification.target_role),
    reference_id: notification.reference_id || notification.booking_id || null,
  };
}

export async function createNotification(payload) {
  const userId = payload.user_id;
  const targetRole = payload.target_role
    ? normalizeRole(payload.target_role)
    : null;
  const bookingId = payload.booking_id || payload.reference_id || null;

  if (!userId) {
    throw new Error("Missing notification receiver.");
  }

  try {
    const { data, error } = await supabase.rpc("create_notification_rpc", {
      p_user_id: userId,
      p_target_role: targetRole,
      p_title: payload.title || "Notification",
      p_message: payload.message || "",
      p_type: payload.type || "general",
      p_reference_id: bookingId,
    });

    if (!error) return data;
  } catch (err) {
    console.error("Notification RPC failed:", err.message);
  }

  const notification = {
    user_id: userId,
    target_role: targetRole,
    title: payload.title || "Notification",
    message: payload.message || "",
    type: payload.type || "general",
    is_read: false,
    booking_id: bookingId,
    reference_id: bookingId,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert([notification])
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createStaffBookingNotifications(bookingId) {
  if (!bookingId) {
    throw new Error("Missing booking ID for staff notification.");
  }

  const { data, error } = await supabase.rpc(
    "create_staff_booking_notifications_rpc",
    {
      p_booking_id: bookingId,
    }
  );

  if (error) throw error;

  return data;
}

export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  const profile =
    data || {
      id: user.id,
      full_name: user.email,
      email: user.email,
      role: "user",
    };

  return {
    ...profile,
    role: normalizeRole(profile.role || "user"),
  };
}

export async function getUserNotifications(userId, role) {
  if (!userId) return [];

  const cleanRole = normalizeRole(role);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || [])
    .map(normalizeNotification)
    .filter((notification) => {
      const targetRole = normalizeRole(notification.target_role);

      if (!cleanRole) return true;
      if (!targetRole) return true;

      return targetRole === cleanRole;
    });
}

export async function getNotifications(userId, role) {
  return getUserNotifications(userId, role);
}

export async function getUnreadNotificationCount(userId, role) {
  const notifications = await getUserNotifications(userId, role);

  return notifications.filter((notification) => !notification.is_read).length;
}

export async function markAsRead(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function markAllAsRead(userId, role) {
  if (!userId) return [];

  const notifications = await getUserNotifications(userId, role);
  const unreadIds = notifications
    .filter((notification) => !notification.is_read)
    .map((notification) => notification.id);

  if (unreadIds.length === 0) return [];

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", unreadIds)
    .select();

  if (error) throw error;

  return data || [];
}

export async function markNotificationAsRead(id) {
  return markAsRead(id);
}

export async function markAllNotificationsAsRead(userId, role) {
  return markAllAsRead(userId, role);
}