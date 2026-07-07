// src/services/bookingService.js

import { supabase } from "./supabaseClient";
import { getReservationExpirationMinutes } from "./paymentSettingsService";
import {
  createAdminNotification,
  createBookingNotification,
  createStaffNotification,
} from "./notificationService";

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

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
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

function buildBookingMetadata(booking = {}) {
  return {
    booking_id: booking.id || null,
    user_id: booking.user_id || null,
    facility_id: booking.facility_id || null,
    facility_name:
      booking.facilities?.name ||
      booking.facility_name ||
      booking.facility ||
      null,
    booking_date: booking.booking_date || null,
    start_time: cleanTime(booking.start_time),
    end_time: cleanTime(booking.end_time),
    session_type: booking.session_type || null,
    total_hours: booking.total_hours || null,
    rate_per_hour: booking.rate_per_hour || null,
    total_amount: booking.total_amount || null,
    amount_paid: booking.amount_paid || null,
    balance_amount: booking.balance_amount || null,
    payment_status: booking.payment_status || null,
    status: booking.status || null,
    receipt_number: booking.receipt_number || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Notification error:", error?.message || error);
  }
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

async function fetchBookingWithDetails(bookingId) {
  if (!bookingId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      facilities (*),
      profiles:user_id (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("fetchBookingWithDetails error:", error.message);
    return null;
  }

  return data || null;
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
        email,
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

  const bookingId =
    typeof data === "string"
      ? data
      : data?.id || data?.booking_id || data?.[0]?.id || data?.[0]?.booking_id;

  const booking = bookingId ? await fetchBookingWithDetails(bookingId) : null;
  const metadata = buildBookingMetadata(booking || payload);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "New Booking Request",
      message: "A customer created a new facility booking request.",
      type: "booking_created",
      referenceId: bookingId || null,
      referenceType: "bookings",
      actionUrl: bookingId
        ? `/staff/manage-bookings?highlight=${bookingId}`
        : "/staff/manage-bookings",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "New Booking Request",
      message: "A new facility booking request was submitted.",
      type: "booking_created",
      referenceId: bookingId || null,
      referenceType: "bookings",
      actionUrl: bookingId
        ? `/admin/manage-bookings?highlight=${bookingId}`
        : "/admin/manage-bookings",
      metadata,
    });
  });

  if (payload.user_id && bookingId) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: payload.user_id,
        bookingId,
        title: "Booking Submitted",
        message: `Your booking request has been submitted. Please wait for staff approval.`,
        type: "booking_created",
        metadata,
      });
    });
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

  const detailedBooking = (await fetchBookingWithDetails(bookingId)) || data;
  const metadata = buildBookingMetadata(detailedBooking);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Payment Proof Submitted",
      message: `A customer submitted payment proof for ${money(amountPaid)}.`,
      type: "payment_uploaded",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/staff/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Payment Proof Submitted",
      message: `Payment proof for ${money(amountPaid)} is waiting for verification.`,
      type: "payment_uploaded",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/admin/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

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

  const checklist = verificationPayload.checklist || {
    amount_matches: true,
    proof_readable: true,
    reference_visible: true,
    receiver_confirmed: true,
  };

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

  const detailedBooking = (await fetchBookingWithDetails(bookingId)) || data;
  const metadata = buildBookingMetadata(detailedBooking);

  if (data.user_id) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: data.user_id,
        bookingId,
        title: "Payment Verified",
        message: `Your payment was verified. Your booking is now approved. Receipt: ${receiptNumber}.`,
        type: "payment_approved",
        metadata,
      });
    });
  }

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Payment Verified",
      message: `A booking payment was verified and receipt ${receiptNumber} was issued.`,
      type: "payment_verified",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/admin/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

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

  const detailedBooking = (await fetchBookingWithDetails(bookingId)) || data;
  const metadata = buildBookingMetadata(detailedBooking);

  if (data.user_id) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: data.user_id,
        bookingId,
        title: "Payment Proof Rejected",
        message:
          reason ||
          "Your payment proof was rejected. Please upload a clearer or correct proof of payment.",
        type: "payment_rejected",
        metadata,
      });
    });
  }

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

  if (data?.user_id) {
    const metadata = buildBookingMetadata(data);

    await safeNotify(async () => {
      await createBookingNotification({
        userId: data.user_id,
        bookingId,
        title: "Reservation Expired",
        message:
          "Your reservation expired because payment was not completed within the allowed time.",
        type: "reservation_expired",
        metadata,
      });
    });
  }

  return data;
}

export async function approveBooking(bookingId) {
  const reservationMinutes = await getReservationExpirationMinutes();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "reserved",
      facility_approval_status: "approved",
      payment_status: "unpaid",
      reservation_expires_at: getReservationExpirationDate(reservationMinutes),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  const detailedBooking = (await fetchBookingWithDetails(bookingId)) || data;
  const metadata = buildBookingMetadata(detailedBooking);

  if (data.user_id) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: data.user_id,
        bookingId,
        title: "Booking Reserved",
        message: `Your booking was approved. Please complete payment within ${reservationMinutes} minutes to confirm your reservation.`,
        type: "booking_reserved",
        metadata,
      });
    });
  }

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Booking Reserved",
      message: "A staff member approved and reserved a customer booking.",
      type: "booking_reserved",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/admin/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

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

  const metadata = buildBookingMetadata(data);

  if (data.user_id) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: data.user_id,
        bookingId,
        title: "Booking Rejected",
        message: reason || "Your booking request was rejected by staff.",
        type: "booking_rejected",
        metadata,
      });
    });
  }

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

  const metadata = buildBookingMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Booking Cancelled",
      message: "A customer cancelled a booking request or reservation.",
      type: "booking_cancelled",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/staff/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Booking Cancelled",
      message: "A customer cancelled a booking request or reservation.",
      type: "booking_cancelled",
      referenceId: bookingId,
      referenceType: "bookings",
      actionUrl: `/admin/manage-bookings?highlight=${bookingId}`,
      metadata,
    });
  });

  return data;
}