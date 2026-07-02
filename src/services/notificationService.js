import { supabase } from "./supabaseClient";

export function getNotificationTarget(profile) {
  const role = String(profile?.role || "user").toLowerCase();

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
  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id,
        role,
        title,
        message,
        type,
        is_read: false,
        reference_id,
        reference_type,
        action_url,
        metadata,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    console.error("createNotification error:", error);
    throw error;
  }

  return data;
}

export async function getNotifications(profile) {
  if (!profile?.id) return [];

  const target = getNotificationTarget(profile);

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.eq("role", target.role);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getNotifications error:", error);
    throw error;
  }

  return data || [];
}

export async function getUnreadNotificationCount(profile) {
  if (!profile?.id) return 0;

  const target = getNotificationTarget(profile);

  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.eq("role", target.role);
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
  if (!profile?.id) return true;

  const notifications = await getNotifications(profile);

  const unreadIds = notifications
    .filter((notification) => !notification.is_read)
    .map((notification) => notification.id);

  if (!unreadIds.length) return true;

  return markNotificationsAsRead(unreadIds);
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
  if (!profile?.id) return true;

  const target = getNotificationTarget(profile);

  let query = supabase.from("notifications").delete().eq("is_read", true);

  if (target.queryType === "user") {
    query = query.eq("user_id", profile.id);
  } else {
    query = query.eq("role", target.role);
  }

  const { error } = await query;

  if (error) {
    console.error("clearReadNotifications error:", error);
    throw error;
  }

  return true;
}

export function subscribeToNotifications(profile, callback) {
  if (!profile?.id) return null;

  const target = getNotificationTarget(profile);

  const channel = supabase
    .channel(`notifications-live-${profile.id}-${target.role}-${Date.now()}`)
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

        if (target.queryType === "user") {
          if (String(row.user_id) === String(profile.id)) {
            callback?.(payload);
          }

          return;
        }

        if (String(row.role) === String(target.role)) {
          callback?.(payload);
        }
      }
    )
    .subscribe();

  return channel;
}