import { supabase } from "./supabaseClient";

export async function createNotification(payload) {
  const { data, error } = await supabase.rpc("create_notification_rpc", {
    p_user_id: payload.user_id,
    p_target_role: payload.target_role || "user",
    p_title: payload.title || "Notification",
    p_message: payload.message || "",
    p_type: payload.type || "general",
    p_reference_id: payload.reference_id || null,
  });

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

  return data || {
    id: user.id,
    full_name: user.email,
    email: user.email,
    role: "user",
  };
}

export async function getUserNotifications(userId, role) {
  if (!userId) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (role) query = query.eq("target_role", role);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getNotifications(userId, role) {
  return getUserNotifications(userId, role);
}

export async function getUnreadNotificationCount(userId, role) {
  const notifications = await getUserNotifications(userId, role);
  return notifications.filter((n) => !n.is_read).length;
}

export async function markAsRead(id) {
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
  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (role) query = query.eq("target_role", role);

  const { data, error } = await query.select();

  if (error) throw error;
  return data || [];
}

export async function markNotificationAsRead(id) {
  return markAsRead(id);
}

export async function markAllNotificationsAsRead(userId, role) {
  return markAllAsRead(userId, role);
}