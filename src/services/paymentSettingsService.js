// src/services/paymentSettingsService.js

import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";
import {
  createAdminNotification,
  createStaffNotification,
} from "./notificationService";
import { uploadPaymentQr } from "./storageService";

const DEFAULT_PAYMENT_SETTINGS = {
  id: "default",
  gcash_name: "",
  gcash_number: "",
  gcash_qr_url: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_qr_url: "",
  payment_instructions:
    "Please upload a clear screenshot of your payment proof before the reservation timer expires.",
  reservation_expiration_minutes: 15,
  is_gcash_enabled: true,
  is_bank_enabled: false,
  is_cash_enabled: true,
};

function cleanString(value) {
  return String(value || "").trim();
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function cleanMinutes(value) {
  const minutes = Number(value || 15);

  if (Number.isNaN(minutes)) return 15;
  if (minutes < 5) return 5;
  if (minutes > 1440) return 1440;

  return minutes;
}

function mergeDefaults(settings = {}) {
  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...(settings || {}),
    reservation_expiration_minutes: cleanMinutes(
      settings?.reservation_expiration_minutes ||
        DEFAULT_PAYMENT_SETTINGS.reservation_expiration_minutes
    ),
    is_gcash_enabled:
      settings?.is_gcash_enabled ?? DEFAULT_PAYMENT_SETTINGS.is_gcash_enabled,
    is_bank_enabled:
      settings?.is_bank_enabled ?? DEFAULT_PAYMENT_SETTINGS.is_bank_enabled,
    is_cash_enabled:
      settings?.is_cash_enabled ?? DEFAULT_PAYMENT_SETTINGS.is_cash_enabled,
  };
}

function buildPaymentSettingsMetadata(settings = {}) {
  return {
    payment_settings_id: settings.id || "default",
    gcash_name: settings.gcash_name || "",
    gcash_number: settings.gcash_number || "",
    gcash_qr_url: settings.gcash_qr_url || "",
    bank_name: settings.bank_name || "",
    bank_account_name: settings.bank_account_name || "",
    bank_account_number: settings.bank_account_number || "",
    bank_qr_url: settings.bank_qr_url || "",
    reservation_expiration_minutes:
      settings.reservation_expiration_minutes || 15,
    is_gcash_enabled: settings.is_gcash_enabled ?? true,
    is_bank_enabled: settings.is_bank_enabled ?? false,
    is_cash_enabled: settings.is_cash_enabled ?? true,
    updated_by: settings.updated_by || null,
    updated_at: settings.updated_at || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error(
      "Payment settings notification error:",
      error?.message || error
    );
  }
}

async function uploadQrFilesIfNeeded(payload = {}, currentSettings = {}) {
  let gcashQrUrl =
    cleanString(payload.gcash_qr_url) ||
    cleanString(currentSettings.gcash_qr_url);

  let bankQrUrl =
    cleanString(payload.bank_qr_url) ||
    cleanString(currentSettings.bank_qr_url);

  if (payload.gcash_qr_file) {
    gcashQrUrl = await uploadPaymentQr(payload.gcash_qr_file, "gcash");
  }

  if (payload.bank_qr_file) {
    bankQrUrl = await uploadPaymentQr(payload.bank_qr_file, "bank");
  }

  return {
    gcash_qr_url: gcashQrUrl,
    bank_qr_url: bankQrUrl,
  };
}

export async function getPaymentSettings() {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getPaymentSettings error:", error.message);
    return DEFAULT_PAYMENT_SETTINGS;
  }

  return mergeDefaults(data);
}

export async function getReservationExpirationMinutes() {
  const settings = await getPaymentSettings();

  return cleanMinutes(settings?.reservation_expiration_minutes);
}

export async function updatePaymentSettings(payload = {}) {
  const currentSettings = await getPaymentSettings();
  const qrUrls = await uploadQrFilesIfNeeded(payload, currentSettings);

  const cleanPayload = {
    id: currentSettings?.id || payload.id || "default",
    gcash_name: cleanString(payload.gcash_name),
    gcash_number: cleanString(payload.gcash_number),
    gcash_qr_url: qrUrls.gcash_qr_url,
    bank_name: cleanString(payload.bank_name),
    bank_account_name: cleanString(payload.bank_account_name),
    bank_account_number: cleanString(payload.bank_account_number),
    bank_qr_url: qrUrls.bank_qr_url,
    payment_instructions: cleanString(payload.payment_instructions),
    reservation_expiration_minutes: cleanMinutes(
      payload.reservation_expiration_minutes
    ),
    is_gcash_enabled:
      payload.is_gcash_enabled !== undefined
        ? cleanBoolean(payload.is_gcash_enabled, true)
        : Boolean(
            cleanString(payload.gcash_name) ||
              cleanString(payload.gcash_number) ||
              qrUrls.gcash_qr_url
          ),
    is_bank_enabled:
      payload.is_bank_enabled !== undefined
        ? cleanBoolean(payload.is_bank_enabled, false)
        : Boolean(
            cleanString(payload.bank_name) ||
              cleanString(payload.bank_account_name) ||
              cleanString(payload.bank_account_number) ||
              qrUrls.bank_qr_url
          ),
    is_cash_enabled:
      payload.is_cash_enabled !== undefined
        ? cleanBoolean(payload.is_cash_enabled, true)
        : currentSettings?.is_cash_enabled ?? true,
    updated_by: payload.updated_by || null,
    updated_at: new Date().toISOString(),
  };

  if (!cleanPayload.payment_instructions) {
    cleanPayload.payment_instructions =
      DEFAULT_PAYMENT_SETTINGS.payment_instructions;
  }

  const { data, error } = await supabase
    .from("payment_settings")
    .upsert([cleanPayload], {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) throw error;

  const metadata = buildPaymentSettingsMetadata(data);

  await createActivityLog({
    action: "update_payment_settings",
    module: "payment_settings",
    description: "Updated payment settings and reservation timer.",
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "payment_settings",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Payment Settings Updated",
      message: "Payment details and reservation timer settings were updated.",
      type: "payment_settings_updated",
      referenceId: data.id,
      referenceType: "payment_settings",
      actionUrl: "/admin/payment-settings",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Payment Settings Updated",
      message: "Payment details and reservation timer settings were updated.",
      type: "payment_settings_updated",
      referenceId: data.id,
      referenceType: "payment_settings",
      actionUrl: "/staff/manage-bookings",
      metadata,
    });
  });

  return mergeDefaults(data);
}

export async function resetPaymentSettings(updatedBy = null) {
  const payload = {
    ...DEFAULT_PAYMENT_SETTINGS,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("payment_settings")
    .upsert([payload], {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) throw error;

  const metadata = buildPaymentSettingsMetadata(data);

  await createActivityLog({
    action: "reset_payment_settings",
    module: "payment_settings",
    description: "Reset payment settings to default values.",
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "payment_settings",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Payment Settings Reset",
      message: "Payment settings were reset to default values.",
      type: "payment_settings_reset",
      referenceId: data.id,
      referenceType: "payment_settings",
      actionUrl: "/admin/payment-settings",
      metadata,
    });
  });

  return mergeDefaults(data);
}

export function formatPaymentMethod(method) {
  const value = String(method || "").toLowerCase();

  if (value === "gcash") return "GCash";
  if (value === "bank") return "Bank Transfer";
  if (value === "bank_transfer") return "Bank Transfer";
  if (value === "cash") return "Cash";

  return method || "Payment";
}

export function getEnabledPaymentMethods(settings = {}) {
  const finalSettings = mergeDefaults(settings);

  const methods = [];

  if (finalSettings.is_gcash_enabled) {
    methods.push({
      value: "gcash",
      label: "GCash",
      name: finalSettings.gcash_name,
      number: finalSettings.gcash_number,
      qr_url: finalSettings.gcash_qr_url,
    });
  }

  if (finalSettings.is_bank_enabled) {
    methods.push({
      value: "bank",
      label: "Bank Transfer",
      bank_name: finalSettings.bank_name,
      account_name: finalSettings.bank_account_name,
      account_number: finalSettings.bank_account_number,
      qr_url: finalSettings.bank_qr_url,
    });
  }

  if (finalSettings.is_cash_enabled) {
    methods.push({
      value: "cash",
      label: "Cash",
    });
  }

  return methods;
}

/* Backward-compatible exports */

export async function savePaymentSettings(payload = {}) {
  return updatePaymentSettings(payload);
}

export async function createPaymentSettings(payload = {}) {
  return updatePaymentSettings(payload);
}

export async function upsertPaymentSettings(payload = {}) {
  return updatePaymentSettings(payload);
}

export async function fetchPaymentSettings() {
  return getPaymentSettings();
}

export async function getPaymentMethods() {
  const settings = await getPaymentSettings();
  return getEnabledPaymentMethods(settings);
}

export async function getReservationTimerMinutes() {
  return getReservationExpirationMinutes();
}

export async function saveReservationExpirationMinutes(minutes, updatedBy = null) {
  const currentSettings = await getPaymentSettings();

  return updatePaymentSettings({
    ...currentSettings,
    reservation_expiration_minutes: minutes,
    updated_by: updatedBy,
  });
}

export function getDefaultPaymentSettings() {
  return { ...DEFAULT_PAYMENT_SETTINGS };
}