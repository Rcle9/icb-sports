// src/services/bookingCompletionService.js

import { supabase } from "./supabaseClient";
import {
  createAdminNotification,
  createBookingNotification,
} from "./notificationService";

function normalizeCompletionStatus(status) {
  const value = String(status || "not_completed").toLowerCase();

  if (value === "completed") return "completed";
  if (value === "no_show") return "no_show";
  if (value === "cancelled_late") return "cancelled_late";

  return "not_completed";
}

function normalizeBookingStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "").toLowerCase();
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time24) {
  if (!time24) return "-";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function buildCompletionMetadata(booking = {}, completionStatus, notes = "") {
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
    formatted_date: formatDate(booking.booking_date),
    formatted_time: `${formatTime(booking.start_time)} - ${formatTime(
      booking.end_time
    )}`,
    status: booking.status || null,
    payment_status: booking.payment_status || null,
    completion_status: completionStatus,
    completion_notes: notes || "",
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Completion notification error:", error?.message || error);
  }
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

async function updateCompletionWithFallback({
  booking_id,
  staff_id,
  completion_status,
  completion_notes = "",
}) {
  try {
    const { data, error } = await supabase.rpc(
      "update_booking_completion_status",
      {
        p_booking_id: booking_id,
        p_staff_id: staff_id,
        p_completion_status: completion_status,
        p_completion_notes: completion_notes,
      }
    );

    if (error) throw error;

    return data;
  } catch (rpcError) {
    console.warn(
      "RPC update_booking_completion_status failed, using direct update:",
      rpcError?.message || rpcError
    );

    const { data, error } = await supabase
      .from("bookings")
      .update({
        completion_status,
        completion_notes,
        completed_by: staff_id || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

export async function updateBookingCompletionStatus({
  booking_id,
  staff_id,
  completion_status,
  completion_notes = "",
}) {
  if (!booking_id) {
    throw new Error("Booking ID is required.");
  }

  const finalCompletionStatus = normalizeCompletionStatus(completion_status);

  if (finalCompletionStatus === "not_completed") {
    throw new Error("Please select a valid completion status.");
  }

  const existingBooking = await fetchBookingWithDetails(booking_id);

  if (!existingBooking) {
    throw new Error("Booking not found.");
  }

  if (!canCompleteBooking(existingBooking)) {
    throw new Error(
      "This booking cannot be completed yet. Only approved, paid, and finished bookings can be marked as completed."
    );
  }

  const result = await updateCompletionWithFallback({
    booking_id,
    staff_id,
    completion_status: finalCompletionStatus,
    completion_notes,
  });

  const updatedBooking = (await fetchBookingWithDetails(booking_id)) || {
    ...existingBooking,
    ...result,
    completion_status: finalCompletionStatus,
    completion_notes,
  };

  const metadata = buildCompletionMetadata(
    updatedBooking,
    finalCompletionStatus,
    completion_notes
  );

  if (updatedBooking.user_id) {
    await safeNotify(async () => {
      await createBookingNotification({
        userId: updatedBooking.user_id,
        bookingId: booking_id,
        title:
          finalCompletionStatus === "completed"
            ? "Booking Completed"
            : finalCompletionStatus === "no_show"
            ? "Booking Marked as No-show"
            : "Booking Marked as Cancelled Late",
        message:
          finalCompletionStatus === "completed"
            ? "Your facility booking has been marked as completed. Thank you for playing at InCredoBall Sports."
            : finalCompletionStatus === "no_show"
            ? "Your facility booking was marked as no-show by staff."
            : "Your facility booking was marked as cancelled late by staff.",
        type:
          finalCompletionStatus === "completed"
            ? "booking_completed"
            : finalCompletionStatus,
        metadata,
      });
    });
  }

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Booking Completion Updated",
      message: `A booking was marked as ${formatCompletionStatus(
        finalCompletionStatus
      )}.`,
      type:
        finalCompletionStatus === "completed"
          ? "booking_completed"
          : finalCompletionStatus,
      referenceId: booking_id,
      referenceType: "bookings",
      actionUrl: `/admin/manage-bookings?highlight=${booking_id}`,
      metadata,
    });
  });

  return result;
}

export function canCompleteBooking(booking) {
  if (!booking) return false;

  const status = normalizeBookingStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(
    booking.completion_status || "not_completed"
  );

  if (completionStatus !== "not_completed") return false;
  if (status !== "approved") return false;
  if (paymentStatus !== "paid") return false;
  if (!booking.booking_date || !booking.end_time) return false;

  const endDateTime = new Date(
    `${booking.booking_date}T${cleanTime(booking.end_time)}:00`
  );

  return endDateTime.getTime() <= Date.now();
}

export function getBookingCompletionAvailability(booking) {
  if (!booking) {
    return {
      allowed: false,
      reason: "Booking not found.",
    };
  }

  const status = normalizeBookingStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(
    booking.completion_status || "not_completed"
  );

  if (completionStatus !== "not_completed") {
    return {
      allowed: false,
      reason: `Already marked as ${formatCompletionStatus(completionStatus)}.`,
    };
  }

  if (status !== "approved") {
    return {
      allowed: false,
      reason: "Only approved bookings can be completed.",
    };
  }

  if (paymentStatus !== "paid") {
    return {
      allowed: false,
      reason: "Only paid bookings can be completed.",
    };
  }

  if (!booking.booking_date || !booking.end_time) {
    return {
      allowed: false,
      reason: "Booking date or end time is missing.",
    };
  }

  const endDateTime = new Date(
    `${booking.booking_date}T${cleanTime(booking.end_time)}:00`
  );

  if (endDateTime.getTime() > Date.now()) {
    return {
      allowed: false,
      reason: "This booking has not ended yet.",
    };
  }

  return {
    allowed: true,
    reason: "This booking can be marked as completed.",
  };
}

export function formatCompletionStatus(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "Completed";
  if (value === "no_show") return "No-show";
  if (value === "cancelled_late") return "Cancelled Late";

  return "Not Completed";
}

export function getCompletionStatusClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export function getCompletionStatusBorderClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "border-green-200 bg-green-50";
  if (value === "no_show") return "border-orange-200 bg-orange-50";
  if (value === "cancelled_late") return "border-red-200 bg-red-50";

  return "border-[#DED8D2] bg-white";
}