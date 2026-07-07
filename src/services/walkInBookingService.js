// src/services/walkInBookingService.js

import { supabase } from "./supabaseClient";
import { createAdminNotification } from "./notificationService";

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getTotalAmount(payload) {
  const totalHours = Number(payload.total_hours || 0);
  const ratePerHour = Number(payload.rate_per_hour || 0);
  const totalAmount = Number(payload.total_amount || 0);

  if (totalAmount > 0) return totalAmount;

  return totalHours * ratePerHour;
}

function generateReceiptNumber(bookingId) {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const idPart = String(bookingId || "")
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `ICB-WALKIN-${datePart}-${idPart || Date.now().toString().slice(-6)}`;
}

function buildWalkInMetadata(booking = {}, payload = {}) {
  return {
    booking_id: booking.id || null,
    staff_id: booking.staff_id || payload.staff_id || null,
    facility_id: booking.facility_id || payload.facility_id || null,
    facility_name:
      booking.facilities?.name ||
      booking.facility_name ||
      payload.facility_name ||
      null,
    customer_name:
      booking.customer_name || payload.customer_name || "Walk-in Customer",
    contact_number: booking.contact_number || payload.contact_number || "",
    booking_date: booking.booking_date || payload.booking_date || null,
    start_time: cleanTime(booking.start_time || payload.start_time),
    end_time: cleanTime(booking.end_time || payload.end_time),
    session_type: booking.session_type || payload.session_type || null,
    total_hours: booking.total_hours || payload.total_hours || null,
    rate_per_hour: booking.rate_per_hour || payload.rate_per_hour || null,
    total_amount: booking.total_amount || payload.total_amount || null,
    amount_paid: booking.amount_paid || payload.amount_paid || null,
    payment_method: booking.payment_method || payload.payment_method || null,
    payment_reference:
      booking.payment_reference || payload.payment_reference || null,
    payment_status: booking.payment_status || "paid",
    status: booking.status || "approved",
    receipt_number: booking.receipt_number || null,
    booking_type: "walk_in",
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Walk-in notification error:", error?.message || error);
  }
}

async function fetchWalkInBookingWithDetails(bookingId) {
  if (!bookingId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      facilities (*),
      staff:staff_id (
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
    console.error("fetchWalkInBookingWithDetails error:", error.message);
    return null;
  }

  return data || null;
}

function extractBookingId(data) {
  if (!data) return null;

  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data?.[0]?.id || data?.[0]?.booking_id || null;
  }

  return data.id || data.booking_id || null;
}

export async function createWalkInBooking(payload) {
  const totalAmount = getTotalAmount(payload);
  const amountPaid = Number(payload.amount_paid || totalAmount);
  const receiptNumber = generateReceiptNumber();

  const { data, error } = await supabase.rpc(
    "create_walk_in_booking_with_conflict_check",
    {
      p_staff_id: payload.staff_id,
      p_facility_id: payload.facility_id,
      p_booking_date: String(payload.booking_date),
      p_start_time: cleanTime(payload.start_time),
      p_end_time: cleanTime(payload.end_time),
      p_customer_name: payload.customer_name || "Walk-in Customer",
      p_contact_number: payload.contact_number || "",
      p_session_type: payload.session_type || "recreational",
      p_notes: payload.notes || "",
      p_total_hours: Number(payload.total_hours || 0),
      p_rate_per_hour: Number(payload.rate_per_hour || 0),
      p_total_amount: totalAmount,
      p_payment_method: payload.payment_method || "Cash",
      p_payment_reference: payload.payment_reference || "",
      p_amount_paid: amountPaid,
    }
  );

  if (error) {
    console.error("createWalkInBooking RPC error:", error);
    throw error;
  }

  const bookingId = extractBookingId(data);
  let booking = bookingId ? await fetchWalkInBookingWithDetails(bookingId) : null;

  if (bookingId) {
    try {
      const { data: updatedBooking, error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "approved",
          facility_approval_status: "approved",
          payment_status: "paid",
          amount_paid: amountPaid,
          balance_amount: Math.max(totalAmount - amountPaid, 0),
          receipt_number: receiptNumber,
          receipt_issued_at: new Date().toISOString(),
          payment_verified_by: payload.staff_id || null,
          payment_verified_at: new Date().toISOString(),
          payment_verification_result: "verified",
          payment_date: new Date().toISOString(),
          payment_method: payload.payment_method || "Cash",
          payment_reference: payload.payment_reference || "",
        })
        .eq("id", bookingId)
        .select()
        .maybeSingle();

      if (!updateError && updatedBooking) {
        booking = await fetchWalkInBookingWithDetails(bookingId);
      }
    } catch (updateError) {
      console.warn("Walk-in booking post-update skipped:", updateError.message);
    }
  }

  const metadata = buildWalkInMetadata(booking || {}, {
    ...payload,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    receipt_number: receiptNumber,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Walk-in Booking Created",
      message: `A walk-in booking was created for ${
        payload.customer_name || "Walk-in Customer"
      } with payment of ${money(amountPaid)}.`,
      type: "walk_in_booking_created",
      referenceId: bookingId || null,
      referenceType: "bookings",
      actionUrl: bookingId
        ? `/admin/manage-bookings?highlight=${bookingId}`
        : "/admin/manage-bookings",
      metadata,
    });
  });

  return booking || data;
}

export async function getWalkInBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      facilities (*),
      staff:staff_id (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .or("booking_type.eq.walk_in,user_id.is.null")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getTodayWalkInBookings() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      facilities (*),
      staff:staff_id (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .eq("booking_date", today)
    .or("booking_type.eq.walk_in,user_id.is.null")
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function deleteWalkInBooking(bookingId) {
  if (!bookingId) throw new Error("Booking ID is required.");

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

  if (error) throw error;

  return true;
}