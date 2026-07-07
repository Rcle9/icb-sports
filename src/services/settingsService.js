// src/services/settingsService.js

import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";
import { createAdminNotification, createStaffNotification } from "./notificationService";

const DEFAULT_SETTINGS = {
  id: "default",
  center_name: "InCredoBall Sports and Development Center",
  center_email: "",
  center_phone: "",
  center_address: "Dumaguete City",
  opening_time: "08:00",
  closing_time: "22:00",
  booking_min_hours: 1,
  booking_max_hours: 4,
  advance_booking_days: 30,
  cancellation_hours_before: 2,
  allow_user_cancellation: true,
  allow_same_day_booking: true,
  maintenance_mode: false,
  maintenance_message:
    "The system is currently under maintenance. Please try again later.",
};

function cleanString(value) {
  return String(value || "").trim();
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);

  if (Number.isNaN(number)) return fallback;

  return number;
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;

  return fallback;
}

function cleanTime(value, fallback = "08:00") {
  if (!value) return fallback;

  return String(value).slice(0, 5);
}

function mergeDefaults(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    opening_time: cleanTime(settings?.opening_time, DEFAULT_SETTINGS.opening_time),
    closing_time: cleanTime(settings?.closing_time, DEFAULT_SETTINGS.closing_time),
    booking_min_hours: cleanNumber(
      settings?.booking_min_hours,
      DEFAULT_SETTINGS.booking_min_hours
    ),
    booking_max_hours: cleanNumber(
      settings?.booking_max_hours,
      DEFAULT_SETTINGS.booking_max_hours
    ),
    advance_booking_days: cleanNumber(
      settings?.advance_booking_days,
      DEFAULT_SETTINGS.advance_booking_days
    ),
    cancellation_hours_before: cleanNumber(
      settings?.cancellation_hours_before,
      DEFAULT_SETTINGS.cancellation_hours_before
    ),
    allow_user_cancellation:
      settings?.allow_user_cancellation ?? DEFAULT_SETTINGS.allow_user_cancellation,
    allow_same_day_booking:
      settings?.allow_same_day_booking ?? DEFAULT_SETTINGS.allow_same_day_booking,
    maintenance_mode:
      settings?.maintenance_mode ?? DEFAULT_SETTINGS.maintenance_mode,
  };
}

function buildSettingsMetadata(settings = {}) {
  return {
    settings_id: settings.id || "default",
    center_name: settings.center_name || DEFAULT_SETTINGS.center_name,
    center_email: settings.center_email || "",
    center_phone: settings.center_phone || "",
    center_address: settings.center_address || "",
    opening_time: settings.opening_time || DEFAULT_SETTINGS.opening_time,
    closing_time: settings.closing_time || DEFAULT_SETTINGS.closing_time,
    booking_min_hours:
      settings.booking_min_hours || DEFAULT_SETTINGS.booking_min_hours,
    booking_max_hours:
      settings.booking_max_hours || DEFAULT_SETTINGS.booking_max_hours,
    advance_booking_days:
      settings.advance_booking_days || DEFAULT_SETTINGS.advance_booking_days,
    cancellation_hours_before:
      settings.cancellation_hours_before ||
      DEFAULT_SETTINGS.cancellation_hours_before,
    allow_user_cancellation:
      settings.allow_user_cancellation ??
      DEFAULT_SETTINGS.allow_user_cancellation,
    allow_same_day_booking:
      settings.allow_same_day_booking ?? DEFAULT_SETTINGS.allow_same_day_booking,
    maintenance_mode:
      settings.maintenance_mode ?? DEFAULT_SETTINGS.maintenance_mode,
    updated_by: settings.updated_by || null,
    updated_at: settings.updated_at || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Settings notification error:", error?.message || error);
  }
}

export async function getSystemSettings() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getSystemSettings error:", error.message);
    return DEFAULT_SETTINGS;
  }

  return mergeDefaults(data);
}

export async function updateSystemSettings(payload = {}) {
  const currentSettings = await getSystemSettings();

  const cleanPayload = {
    id: currentSettings?.id || "default",
    center_name:
      cleanString(payload.center_name) || DEFAULT_SETTINGS.center_name,
    center_email: cleanString(payload.center_email),
    center_phone: cleanString(payload.center_phone),
    center_address:
      cleanString(payload.center_address) || DEFAULT_SETTINGS.center_address,
    opening_time: cleanTime(payload.opening_time, DEFAULT_SETTINGS.opening_time),
    closing_time: cleanTime(payload.closing_time, DEFAULT_SETTINGS.closing_time),
    booking_min_hours: Math.max(
      1,
      cleanNumber(payload.booking_min_hours, DEFAULT_SETTINGS.booking_min_hours)
    ),
    booking_max_hours: Math.max(
      1,
      cleanNumber(payload.booking_max_hours, DEFAULT_SETTINGS.booking_max_hours)
    ),
    advance_booking_days: Math.max(
      1,
      cleanNumber(
        payload.advance_booking_days,
        DEFAULT_SETTINGS.advance_booking_days
      )
    ),
    cancellation_hours_before: Math.max(
      0,
      cleanNumber(
        payload.cancellation_hours_before,
        DEFAULT_SETTINGS.cancellation_hours_before
      )
    ),
    allow_user_cancellation: cleanBoolean(
      payload.allow_user_cancellation,
      DEFAULT_SETTINGS.allow_user_cancellation
    ),
    allow_same_day_booking: cleanBoolean(
      payload.allow_same_day_booking,
      DEFAULT_SETTINGS.allow_same_day_booking
    ),
    maintenance_mode: cleanBoolean(
      payload.maintenance_mode,
      DEFAULT_SETTINGS.maintenance_mode
    ),
    maintenance_message:
      cleanString(payload.maintenance_message) ||
      DEFAULT_SETTINGS.maintenance_message,
    updated_by: payload.updated_by || null,
    updated_at: new Date().toISOString(),
  };

  if (cleanPayload.booking_max_hours < cleanPayload.booking_min_hours) {
    cleanPayload.booking_max_hours = cleanPayload.booking_min_hours;
  }

  const { data, error } = await supabase
    .from("system_settings")
    .upsert([cleanPayload], {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) throw error;

  const metadata = buildSettingsMetadata(data);

  await createActivityLog({
    action: "update_system_settings",
    module: "settings",
    description: "Updated system settings.",
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "system_settings",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "System Settings Updated",
      message: "System settings were updated by an administrator.",
      type: "settings_updated",
      referenceId: data.id,
      referenceType: "system_settings",
      actionUrl: "/admin/settings",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createStaffNotification({
      title: "System Settings Updated",
      message: "Booking and system settings were updated.",
      type: "settings_updated",
      referenceId: data.id,
      referenceType: "system_settings",
      actionUrl: "/staff/dashboard",
      metadata,
    });
  });

  return mergeDefaults(data);
}

export async function resetSystemSettings(updatedBy = null) {
  const payload = {
    ...DEFAULT_SETTINGS,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("system_settings")
    .upsert([payload], {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) throw error;

  const metadata = buildSettingsMetadata(data);

  await createActivityLog({
    action: "reset_system_settings",
    module: "settings",
    description: "Reset system settings to default values.",
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "system_settings",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "System Settings Reset",
      message: "System settings were reset to default values.",
      type: "settings_reset",
      referenceId: data.id,
      referenceType: "system_settings",
      actionUrl: "/admin/settings",
      metadata,
    });
  });

  return mergeDefaults(data);
}

export async function getBookingRules() {
  const settings = await getSystemSettings();

  return {
    opening_time: settings.opening_time,
    closing_time: settings.closing_time,
    booking_min_hours: settings.booking_min_hours,
    booking_max_hours: settings.booking_max_hours,
    advance_booking_days: settings.advance_booking_days,
    cancellation_hours_before: settings.cancellation_hours_before,
    allow_user_cancellation: settings.allow_user_cancellation,
    allow_same_day_booking: settings.allow_same_day_booking,
  };
}

export async function isMaintenanceModeEnabled() {
  const settings = await getSystemSettings();

  return {
    enabled: Boolean(settings.maintenance_mode),
    message:
      settings.maintenance_message || DEFAULT_SETTINGS.maintenance_message,
  };
}

export function formatBusinessHours(settings = DEFAULT_SETTINGS) {
  const finalSettings = mergeDefaults(settings);

  return `${finalSettings.opening_time} - ${finalSettings.closing_time}`;
}

export function isWithinBusinessHours(time, settings = DEFAULT_SETTINGS) {
  const finalSettings = mergeDefaults(settings);
  const cleanValue = cleanTime(time, "00:00");

  return (
    cleanValue >= finalSettings.opening_time &&
    cleanValue <= finalSettings.closing_time
  );
}

export function getDefaultSystemSettings() {
  return { ...DEFAULT_SETTINGS };
}