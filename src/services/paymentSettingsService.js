import { supabase } from "./supabaseClient";

const PAYMENT_QR_BUCKET = "payment-qrs";
const DEFAULT_RESERVATION_MINUTES = 15;

function getFileExtension(file) {
  const name = file?.name || "";
  const extension = name.split(".").pop();

  return extension || "png";
}

async function uploadPaymentQr(file, type) {
  if (!file) return null;

  const extension = getFileExtension(file);
  const filePath = `${type}-qr-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_QR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(PAYMENT_QR_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

export async function getPaymentSettings() {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getReservationExpirationMinutes() {
  try {
    const settings = await getPaymentSettings();
    const minutes = Number(settings?.reservation_expiration_minutes || 0);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return DEFAULT_RESERVATION_MINUTES;
    }

    return minutes;
  } catch (error) {
    console.error("Failed to load reservation expiration minutes:", error.message);
    return DEFAULT_RESERVATION_MINUTES;
  }
}

export async function savePaymentSettings(payload) {
  const {
    id,
    gcash_qr_file,
    bank_qr_file,
    updated_by,
    ...settingsPayload
  } = payload;

  let gcashQrUrl = settingsPayload.gcash_qr_url || null;
  let bankQrUrl = settingsPayload.bank_qr_url || null;

  if (gcash_qr_file) {
    gcashQrUrl = await uploadPaymentQr(gcash_qr_file, "gcash");
  }

  if (bank_qr_file) {
    bankQrUrl = await uploadPaymentQr(bank_qr_file, "bank");
  }

  const minutes = Number(settingsPayload.reservation_expiration_minutes || 15);

  const finalPayload = {
    ...settingsPayload,
    gcash_qr_url: gcashQrUrl,
    bank_qr_url: bankQrUrl,
    reservation_expiration_minutes:
      Number.isFinite(minutes) && minutes > 0 ? minutes : 15,
    updated_by,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("payment_settings")
      .update(finalPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from("payment_settings")
    .insert(finalPayload)
    .select()
    .single();

  if (error) throw error;

  return data;
}