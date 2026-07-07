// src/services/syncService.js

import { supabase } from "./supabaseClient";

function normalizeTableName(tableName) {
  return String(tableName || "").trim();
}

function createChannelName(prefix = "sync") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeToTable({
  table,
  event = "*",
  schema = "public",
  filter,
  callback,
  channelName,
}) {
  const tableName = normalizeTableName(table);

  if (!tableName) {
    console.error("subscribeToTable error: table name is required.");
    return null;
  }

  if (typeof callback !== "function") {
    console.error("subscribeToTable error: callback must be a function.");
    return null;
  }

  const config = {
    event,
    schema,
    table: tableName,
  };

  if (filter) {
    config.filter = filter;
  }

  const channel = supabase
    .channel(channelName || createChannelName(`sync-${tableName}`))
    .on("postgres_changes", config, callback)
    .subscribe();

  return channel;
}

export function unsubscribe(channel) {
  if (!channel) return;

  supabase.removeChannel(channel);
}

export function unsubscribeFromTable(channel) {
  unsubscribe(channel);
}

export function subscribeToBookings(callback) {
  return subscribeToTable({
    table: "bookings",
    callback,
    channelName: createChannelName("bookings"),
  });
}

export function subscribeToFacilities(callback) {
  return subscribeToTable({
    table: "facilities",
    callback,
    channelName: createChannelName("facilities"),
  });
}

export function subscribeToInventory(callback) {
  return subscribeToTable({
    table: "inventory",
    callback,
    channelName: createChannelName("inventory"),
  });
}

export function subscribeToMaintenance(callback) {
  return subscribeToTable({
    table: "maintenance",
    callback,
    channelName: createChannelName("maintenance"),
  });
}

export function subscribeToNotifications(callback) {
  return subscribeToTable({
    table: "notifications",
    callback,
    channelName: createChannelName("notifications"),
  });
}

export function subscribeToActivityLogs(callback) {
  return subscribeToTable({
    table: "activity_logs",
    callback,
    channelName: createChannelName("activity-logs"),
  });
}

export function subscribeToProfiles(callback) {
  return subscribeToTable({
    table: "profiles",
    callback,
    channelName: createChannelName("profiles"),
  });
}

export function subscribeToUserNotifications(userId, callback) {
  if (!userId) return null;

  return subscribeToTable({
    table: "notifications",
    filter: `user_id=eq.${userId}`,
    callback,
    channelName: createChannelName(`user-notifications-${userId}`),
  });
}

export function subscribeToRoleNotifications(role, callback) {
  const cleanRole = String(role || "").toLowerCase();

  if (!cleanRole) return null;

  return subscribeToTable({
    table: "notifications",
    filter: `role=eq.${cleanRole}`,
    callback,
    channelName: createChannelName(`role-notifications-${cleanRole}`),
  });
}

export function subscribeToUserBookings(userId, callback) {
  if (!userId) return null;

  return subscribeToTable({
    table: "bookings",
    filter: `user_id=eq.${userId}`,
    callback,
    channelName: createChannelName(`user-bookings-${userId}`),
  });
}

export function subscribeToFacilityBookings(facilityId, callback) {
  if (!facilityId) return null;

  return subscribeToTable({
    table: "bookings",
    filter: `facility_id=eq.${facilityId}`,
    callback,
    channelName: createChannelName(`facility-bookings-${facilityId}`),
  });
}

export function subscribeToTodayBookings(callback) {
  const today = new Date().toISOString().slice(0, 10);

  return subscribeToTable({
    table: "bookings",
    filter: `booking_date=eq.${today}`,
    callback,
    channelName: createChannelName("today-bookings"),
  });
}

export async function getConnectionStatus() {
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) throw error;

    return {
      online: true,
      message: "Connected to Supabase.",
    };
  } catch (error) {
    return {
      online: false,
      message: error.message || "Unable to connect to Supabase.",
    };
  }
}

export async function refreshTable(tableName, options = {}) {
  const table = normalizeTableName(tableName);

  if (!table) {
    throw new Error("Table name is required.");
  }

  let query = supabase.from(table).select(options.select || "*");

  if (options.eq && Array.isArray(options.eq)) {
    options.eq.forEach(([column, value]) => {
      query = query.eq(column, value);
    });
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, {
      ascending: options.ascending ?? false,
    });
  }

  if (options.limit) {
    query = query.limit(Number(options.limit));
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function refreshBookings() {
  return refreshTable("bookings", {
    select: `
      *,
      facilities (*),
      profiles:user_id (
        id,
        full_name,
        email,
        role
      )
    `,
    orderBy: "created_at",
    ascending: false,
  });
}

export async function refreshFacilities() {
  return refreshTable("facilities", {
    orderBy: "created_at",
    ascending: false,
  });
}

export async function refreshInventory() {
  return refreshTable("inventory", {
    orderBy: "created_at",
    ascending: false,
  });
}

export async function refreshMaintenance() {
  return refreshTable("maintenance", {
    select: `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `,
    orderBy: "created_at",
    ascending: false,
  });
}

export async function refreshNotifications(profile) {
  if (!profile?.id) return [];

  const role = String(profile?.role || "user").toLowerCase();

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "admin" || role === "staff") {
    query = query.or(`user_id.eq.${profile.id},role.eq.${role}`);
  } else {
    query = query.eq("user_id", profile.id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function refreshActivityLogs(limit = 100) {
  return refreshTable("activity_logs", {
    orderBy: "created_at",
    ascending: false,
    limit,
  });
}

export function createRealtimeManager() {
  const channels = new Set();

  function add(channel) {
    if (channel) channels.add(channel);
    return channel;
  }

  function remove(channel) {
    if (!channel) return;

    supabase.removeChannel(channel);
    channels.delete(channel);
  }

  function removeAll() {
    channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });

    channels.clear();
  }

  return {
    add,
    remove,
    removeAll,
    size: channels.size,
  };
}

/* Backward-compatible export names */

export function subscribeRealtime(table, callback, options = {}) {
  return subscribeToTable({
    table,
    callback,
    event: options.event || "*",
    schema: options.schema || "public",
    filter: options.filter,
    channelName: options.channelName,
  });
}

export function unsubscribeRealtime(channel) {
  unsubscribe(channel);
}

export function removeRealtimeChannel(channel) {
  unsubscribe(channel);
}

export function cleanupRealtime(channel) {
  unsubscribe(channel);
}

export async function checkConnection() {
  return getConnectionStatus();
}

export async function syncTable(tableName, options = {}) {
  return refreshTable(tableName, options);
}