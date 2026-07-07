// src/services/notificationService.js

import { supabase } from "./supabaseClient";

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function cleanPayloadValue(value) {
  if (value === undefined) return null;
  return value;
}

export function getNotificationTarget(profile) {
  const role = normalizeRole(profile?.role);

  if (role === "admin") {
    return {
      role: "admin",
      queryType: "role",
    };
  }

  if (role === "staff") {
    return {
      role: "staff",
      queryType: "role",
    };
  }

  return {
    role: "user",
    queryType: "user",
  };
}

export function getRoleNotificationsPath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/notifications";
  if (normalizedRole === "staff") return "/staff/notifications";

  return "/user/notifications";
}

export function getRoleProfilePath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/profile";
  if (normalizedRole === "staff") return "/staff/profile";

  return "/user/profile";
}

export function getRoleDashboardPath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";

  return "/dashboard";
}

export function getBookingActionPath(role, bookingId, type = "") {
  const normalizedRole = normalizeRole(role);
  const notificationType = String(type || "").toLowerCase();

  if (!bookingId) {
    return getRoleNotificationsPath(normalizedRole);
  }

  if (normalizedRole === "admin") {
    return `/admin/manage-bookings?highlight=${bookingId}`;
  }

  if (normalizedRole === "staff") {
    return `/staff/manage-bookings?highlight=${bookingId}`;
  }

  if (
    notificationType === "booking_reserved" ||
    notificationType === "payment_rejected" ||
    notificationType === "reservation_expired" ||
    notificationType === "booking_expired"
  ) {
    return `/my-bookings?highlight=${bookingId}&pay=1`;
  }

  return `/my-bookings?highlight=${bookingId}`;
}

export function getNotificationActionUrl(notification, role = "user") {
  if (notification?.action_url) return notification.action_url;

  const referenceId = notification?.reference_id;
  const referenceType = String(notification?.reference_type || "").toLowerCase();

  if (referenceId && referenceType === "bookings") {
    return getBookingActionPath(role, referenceId, notification?.type);
  }

  return getRoleNotificationsPath(role);
}

export async function getCurrentProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function createNotification({
  user_id = null,
  role = null,
  title = "Notification",
  message = "You have a new notification.",
  type = "general",
  reference_id = null,
  reference_type = null,
  action_url = null,
  metadata = {},
}) {
  const payload = {
    user_id: cleanPayloadValue(user_id),
    role: role ? normalizeRole(role) : null,
    title: title || "Notification",
    message: message || "You have a new notification.",
    type: type || "general",
    is_read: false,
    reference_id: cleanPayloadValue(reference_id),
    reference_type: cleanPayloadValue(reference_type),
    action_url: cleanPayloadValue(action_url),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert([payload])
    .select()
    .maybeSingle();

  if (error) {
    console.error("createNotification error:", error);
    throw error;
  }

  return data;
}

export async function createUserNotification({
  userId,
  title = "Notification",
  message = "You have a new notification.",
  type = "general",
  referenceId = null,
  referenceType = null,
  actionUrl = null,
  metadata = {},
}) {
  if (!userId) return null;

  return createNotification({
    user_id: userId,
    role: null,
    title,
    message,
    type,
    reference_id: referenceId,
    reference_type: referenceType,
    action_url: actionUrl,
    metadata,
  });
}

export async function createRoleNotification({
  role,
  title = "Notification",
  message = "You have a new notification.",
  type = "general",
  referenceId = null,
  referenceType = null,
  actionUrl = null,
  metadata = {},
}) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole !== "admin" && normalizedRole !== "staff") return null;

  return createNotification({
    user_id: null,
    role: normalizedRole,
    title,
    message,
    type,
    reference_id: referenceId,
    reference_type: referenceType,
    action_url: actionUrl,
    metadata,
  });
}

export async function createStaffNotification({
  title = "Staff Notification",
  message = "There is a new update for staff.",
  type = "staff_update",
  referenceId = null,
  referenceType = null,
  actionUrl = null,
  metadata = {},
}) {
  return createRoleNotification({
    role: "staff",
    title,
    message,
    type,
    referenceId,
    referenceType,
    actionUrl,
    metadata,
  });
}

export async function createAdminNotification({
  title = "Admin Notification",
  message = "There is a new update for admin.",
  type = "admin_update",
  referenceId = null,
  referenceType = null,
  actionUrl = null,
  metadata = {},
}) {
  return createRoleNotification({
    role: "admin",
    title,
    message,
    type,
    referenceId,
    referenceType,
    actionUrl,
    metadata,
  });
}

export async function createBookingNotification({
  userId = null,
  role = null,
  bookingId,
  title = "Booking Update",
  message = "There is an update for a booking.",
  type = "booking_update",
  metadata = {},
}) {
  const normalizedRole = role ? normalizeRole(role) : null;

  return createNotification({
    user_id: userId,
    role: normalizedRole,
    title,
    message,
    type,
    reference_id: bookingId,
    reference_type: "bookings",
    action_url: bookingId
      ? getBookingActionPath(normalizedRole || "user", bookingId, type)
      : null,
    metadata,
  });
}

export async function getNotifications(profile) {
  if (!profile?.id && profile?.role !== "admin" && profile?.role !== "staff") {
    return [];
  }

  const target = getNotificationTarget(profile);

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.or(`user_id.eq.${profile.id},role.eq.${target.role}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getNotifications error:", error);
    throw error;
  }

  return data || [];
}

export async function getUserNotifications(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserNotifications error:", error);
    throw error;
  }

  return data || [];
}

export async function getRoleNotifications(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole !== "admin" && normalizedRole !== "staff") return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("role", normalizedRole)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRoleNotifications error:", error);
    throw error;
  }

  return data || [];
}

export async function getUnreadNotificationCount(profile) {
  if (!profile?.id && profile?.role !== "admin" && profile?.role !== "staff") {
    return 0;
  }

  const target = getNotificationTarget(profile);

  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.or(`user_id.eq.${profile.id},role.eq.${target.role}`);
  }

  const { count, error } = await query;

  if (error) {
    console.error("getUnreadNotificationCount error:", error);
    throw error;
  }

  return count || 0;
}

export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return false;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId);

  if (error) {
    console.error("markNotificationAsRead error:", error);
    throw error;
  }

  return true;
}

export async function markAsRead(notificationId) {
  return markNotificationAsRead(notificationId);
}

export async function markNotificationsAsRead(notificationIds = []) {
  if (!notificationIds.length) return true;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .in("id", notificationIds);

  if (error) {
    console.error("markNotificationsAsRead error:", error);
    throw error;
  }

  return true;
}

export async function markAllNotificationsAsRead(profile) {
  if (!profile?.id && profile?.role !== "admin" && profile?.role !== "staff") {
    return true;
  }

  const notifications = await getNotifications(profile);

  const unreadIds = notifications
    .filter((notification) => !notification.is_read)
    .map((notification) => notification.id);

  if (!unreadIds.length) return true;

  return markNotificationsAsRead(unreadIds);
}

export async function markAllAsRead(userId) {
  if (!userId) return true;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("markAllAsRead error:", error);
    throw error;
  }

  return true;
}

export async function deleteNotification(notificationId) {
  if (!notificationId) return false;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("deleteNotification error:", error);
    throw error;
  }

  return true;
}

export async function clearReadNotifications(profile) {
  if (!profile?.id && profile?.role !== "admin" && profile?.role !== "staff") {
    return true;
  }

  const target = getNotificationTarget(profile);

  let query = supabase.from("notifications").delete().eq("is_read", true);

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.or(`user_id.eq.${profile.id},role.eq.${target.role}`);
  }

  const { error } = await query;

  if (error) {
    console.error("clearReadNotifications error:", error);
    throw error;
  }

  return true;
}

export function isNotificationForProfile(notification, profile) {
  if (!notification || !profile) return false;

  const role = normalizeRole(profile?.role);
  const notificationUserId = notification.user_id;
  const notificationRole = String(notification.role || "").toLowerCase();

  if (notificationUserId && String(notificationUserId) === String(profile.id)) {
    return true;
  }

  if ((role === "admin" || role === "staff") && notificationRole === role) {
    return true;
  }

  return false;
}

export function subscribeToNotifications(profile, callback) {
  if (!profile?.id && profile?.role !== "admin" && profile?.role !== "staff") {
    return null;
  }

  const role = normalizeRole(profile?.role);

  const channel = supabase
    .channel(`notifications-live-${profile?.id || role}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        const row = payload.new || payload.old;

        if (!row) {
          callback?.(payload);
          return;
        }

        if (isNotificationForProfile(row, profile)) {
          callback?.(payload);
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromNotifications(channel) {
  if (!channel) return;

  supabase.removeChannel(channel);
}