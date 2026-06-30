import { supabase } from "./supabaseClient";
import { getReservationExpirationMinutes } from "./paymentSettingsService";

const PAYMENT_PROOF_BUCKET = "payment-proofs";

function cleanTime(time) {
  if (!time) return "00:00";
  return String(time).slice(0, 5);
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function getTotalAmount(payload) {
  const totalHours = Number(payload.total_hours || 0);
  const ratePerHour = Number(payload.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(payload.total_amount || 0) || computedTotal;
}

function getReservationExpirationDate(minutes) {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + Number(minutes || 15));

  return expiration.toISOString();
}

function generateReceiptNumber(bookingId) {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const idPart = String(bookingId || "")
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `ICB-${datePart}-${idPart || Date.now().toString().slice(-6)}`;
}

function isExpiredUnpaidReservation(booking) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  if (status !== "reserved") return false;
  if (!["unpaid", "rejected_payment"].includes(paymentStatus)) return false;
  if (!booking.reservation_expires_at) return false;

  return new Date(booking.reservation_expires_at).getTime() <= Date.now();
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id || null;
}

function getFileExtension(file) {
  const name = file?.name || "";
  return name.split(".").pop() || "png";
}

async function uploadPaymentProof(file, bookingId) {
  if (!file) return null;

  const extension = getFileExtension(file);
  const filePath = `${bookingId}/proof-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

export async function getAllBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      facilities (*),
      profiles:user_id (
        id,
        full_name,
        role
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function createBooking(payload) {
  const reservationMinutes = await getReservationExpirationMinutes();
  const totalAmount = getTotalAmount(payload);

  const { data, error } = await supabase.rpc(
    "create_booking_with_conflict_check",
    {
      p_user_id: payload.user_id,
      p_facility_id: payload.facility_id,
      p_booking_date: String(payload.booking_date),
      p_start_time: cleanTime(payload.start_time),
      p_end_time: cleanTime(payload.end_time),
      p_session_type: payload.session_type || "training",
      p_notes: payload.notes || "",
      p_total_hours: Number(payload.total_hours || 0),
      p_rate_per_hour: Number(payload.rate_per_hour || 0),
      p_total_amount: totalAmount,
      p_reservation_expires_at: getReservationExpirationDate(reservationMinutes),
    }
  );

  if (error) {
    console.error("createBooking RPC error:", error);
    throw error;
  }

  return data;
}

export async function submitPaymentProof(bookingId, payload) {
  if (!bookingId) throw new Error("Booking ID is required.");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking) throw new Error("Booking not found.");

  if (normalizeStatus(booking.status) !== "reserved") {
    throw new Error("Only reserved bookings can submit payment proof.");
  }

  if (isExpiredUnpaidReservation(booking)) {
    await expireBookingReservation(booking.id);
    throw new Error("This reservation already expired. Please book again.");
  }

  const proofUrl =
    payload.payment_proof_url ||
    (payload.file ? await uploadPaymentProof(payload.file, bookingId) : null);

  if (!proofUrl) {
    throw new Error("Please upload a payment screenshot.");
  }

  const amountPaid = Number(payload.amount_paid || 0);
  const totalAmount = Number(booking.total_amount || 0);
  const balance = Math.max(totalAmount - amountPaid, 0);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      payment_status: "pending_verification",
      amount_paid: amountPaid,
      balance_amount: balance,
      payment_method: payload.payment_method || null,
      payment_reference: payload.payment_reference || null,
      payment_notes: payload.payment_notes || null,
      payment_proof_url: proofUrl,
      payment_date: new Date().toISOString(),
      payment_submitted_at: new Date().toISOString(),
      payment_rejection_reason: null,
      payment_verification_result: null,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function verifyPayment(bookingId, verificationPayload = {}) {
  const staffId = await getCurrentUserId();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking) throw new Error("Booking not found.");

  if (normalizePaymentStatus(booking.payment_status) !== "pending_verification") {
    throw new Error("This booking has no payment proof pending verification.");
  }

  const amountPaid = Number(booking.amount_paid || 0);
  const totalAmount = Number(booking.total_amount || 0);

  if (amountPaid < totalAmount) {
    throw new Error("Amount paid is lower than the total booking amount.");
  }

  const checklist = verificationPayload.checklist || {};

  const requiredChecklist = [
    checklist.amount_matches,
    checklist.proof_readable,
    checklist.reference_visible,
    checklist.receiver_confirmed,
  ];

  if (requiredChecklist.some((item) => item !== true)) {
    throw new Error("Please complete the payment verification checklist first.");
  }

  const receiptNumber =
    booking.receipt_number || generateReceiptNumber(booking.id);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "approved",
      facility_approval_status: "approved",
      payment_status: "paid",
      balance_amount: 0,
      payment_verified_by: staffId,
      payment_verified_at: new Date().toISOString(),
      payment_rejection_reason: null,
      receipt_number: receiptNumber,
      receipt_issued_at: new Date().toISOString(),
      payment_verification_checklist: checklist,
      payment_verification_notes: verificationPayload.notes || "",
      payment_verification_result: "verified",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function rejectPayment(
  bookingId,
  reason = "",
  verificationPayload = {}
) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "reserved",
      payment_status: "rejected_payment",
      payment_rejection_reason: reason || "Payment proof was rejected.",
      payment_verified_by: null,
      payment_verified_at: null,
      payment_verification_checklist: verificationPayload.checklist || {},
      payment_verification_notes: verificationPayload.notes || "",
      payment_verification_result: "rejected",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function expireBookingReservation(bookingId) {
  if (!bookingId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "expired",
      payment_status: "expired",
      facility_approval_status: "expired",
      balance_amount: 0,
    })
    .eq("id", bookingId)
    .eq("status", "reserved")
    .in("payment_status", ["unpaid", "rejected_payment"])
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function approveBooking(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "approved",
      facility_approval_status: "approved",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function rejectBooking(bookingId, reason = "") {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "rejected",
      facility_approval_status: "rejected",
      rejection_reason: reason || "Booking request was rejected.",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function cancelBooking(bookingId, reason = "") {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking) throw new Error("Booking not found.");

  const status = normalizeStatus(booking.status);

  if (!["reserved", "pending"].includes(status)) {
    throw new Error("Only reserved or pending bookings can be cancelled.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      facility_approval_status: "cancelled",
      cancellation_reason: reason || "Cancelled by user.",
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}