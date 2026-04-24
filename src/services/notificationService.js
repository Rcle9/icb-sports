import { supabase } from "./supabaseClient";

export async function createNotification(payload) {
  const cleanPayload = {
    user_id: payload.user_id,
    title: payload.title || "Notification",
    message: payload.message || "",
    type: payload.type || "general",
    is_read: false,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}

export async function markAsRead(notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAllAsRead(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .select();

  if (error) throw error;
  return data || [];
}