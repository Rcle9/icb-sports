import { supabase } from "./supabaseClient";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "coach") return "user";
  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "user";
}

function getRoleTargets(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") {
    return ["admin", "staff"];
  }

  if (cleanRole === "staff") {
    return ["staff"];
  }

  return [];
}

function normalizeNotification(item) {
  const metadata = item?.metadata || {};

  const bookingId =
    metadata.booking_id ||
    metadata.reference_id ||
    item?.reference_id ||
    item?.booking_id ||
    null;

  return {
    ...item,
    metadata,
    reference_id: bookingId,
    booking_id: bookingId,
  };
}

function mergeNotifications(personalNotifications, roleNotifications) {
  const map = new Map();

  [...(personalNotifications || []), ...(roleNotifications || [])].forEach(
    (item) => {
      if (!item?.id) return;
      map.set(item.id, normalizeNotification(item));
    }
  );

  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

export async function getUserNotifications(userId, role = "user", limit = 50) {
  if (!userId) return [];

  const roleTargets = getRoleTargets(role);

  const { data: personalData, error: personalError } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (personalError) throw personalError;

  let roleData = [];

  if (roleTargets.length > 0) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .in("role", roleTargets)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    roleData = data || [];
  }

  return mergeNotifications(personalData || [], roleData).slice(0, limit);
}

export async function getUnreadNotificationCount(userId, role = "user") {
  const notifications = await getUserNotifications(userId, role, 200);

  return notifications.filter((item) => !item.is_read).length;
}

export async function markAsRead(notificationId) {
  if (!notificationId) return null;

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function markAllAsRead(userId, role = "user") {
  if (!userId) return;

  const notifications = await getUserNotifications(userId, role, 200);

  const unreadIds = notifications
    .filter((item) => !item.is_read)
    .map((item) => item.id);

  if (unreadIds.length === 0) return;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .in("id", unreadIds);

  if (error) throw error;
}

export async function createNotification({
  user_id = null,
  role = null,
  title,
  message,
  type = "general",
  metadata = {},
}) {
  if (!title || !message) {
    throw new Error("Notification title and message are required.");
  }

  const payload = {
    user_id,
    role,
    title,
    message,
    type,
    metadata,
    is_read: false,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function createStaffBookingNotification(
  title,
  message,
  bookingId = null,
  metadata = {}
) {
  return createNotification({
    role: "staff",
    title: title || "Booking Notification",
    message: message || "There is a booking update.",
    type: "booking",
    metadata: {
      ...metadata,
      booking_id: bookingId,
      reference_id: bookingId,
    },
  });
}

export async function createStaffBookingNotifications(
  title,
  message,
  bookingId = null,
  metadata = {}
) {
  return createStaffBookingNotification(title, message, bookingId, metadata);
}

export async function createUserNotification(
  userId,
  title,
  message,
  bookingId = null,
  metadata = {}
) {
  if (!userId) return null;

  return createNotification({
    user_id: userId,
    title: title || "Notification",
    message: message || "You have a new update.",
    type: "booking_update",
    metadata: {
      ...metadata,
      booking_id: bookingId,
      reference_id: bookingId,
    },
  });
}

export async function createRoleNotification(
  role,
  title,
  message,
  bookingId = null,
  metadata = {}
) {
  return createNotification({
    role: normalizeRole(role),
    title: title || "Notification",
    message: message || "There is a new update.",
    type: "role_notification",
    metadata: {
      ...metadata,
      booking_id: bookingId,
      reference_id: bookingId,
    },
  });
}