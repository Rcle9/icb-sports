import { supabase } from "./supabaseClient";
import {
  createNotification,
  createStaffBookingNotifications,
} from "./notificationService";

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function timeToMinutes(time) {
  const value = cleanTime(time);
  if (!value || !value.includes(":")) return 0;

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timesOverlap(startA, endA, startB, endB) {
  return (
    timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(endA) > timeToMinutes(startB)
  );
}

function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) {
    throw new Error("Please select a valid time slot.");
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new Error("End time must be later than start time.");
  }
}

function validateNotPastDate(bookingDate) {
  if (!bookingDate) throw new Error("Please select a booking date.");

  const today = new Date().toISOString().split("T")[0];

  if (bookingDate < today) {
    throw new Error("You cannot book a past date.");
  }
}

async function safeCreateNotification(payload) {
  try {
    await createNotification({
      user_id: payload.user_id,
      target_role: payload.target_role || null,
      title: payload.title || "Notification",
      message: payload.message || "",
      type: payload.type || "general",
      booking_id: payload.booking_id || payload.reference_id || null,
      reference_id: payload.reference_id || payload.booking_id || null,
    });
  } catch (err) {
    console.error("Create notification error:", err.message);
  }
}

async function getStaffAndAdminProfiles() {
  const { data, error } = await supabase.from("profiles").select("id, role");

  if (error) throw error;

  return (data || []).filter((profile) => {
    const role = String(profile.role || "").toLowerCase();
    return role === "staff" || role === "admin";
  });
}

async function notifyStaffAndAdmin(booking) {
  try {
    await createStaffBookingNotifications(booking.id);
    return;
  } catch (rpcError) {
    console.error("Staff booking notification RPC error:", rpcError.message);
  }

  try {
    const receivers = await getStaffAndAdminProfiles();

    if (receivers.length === 0) return;

    await Promise.all(
      receivers.map((person) =>
        safeCreateNotification({
          user_id: person.id,
          target_role: String(person.role || "").toLowerCase(),
          title: "New Facility Booking",
          message: "A new facility booking request was submitted.",
          type: "booking_request",
          booking_id: booking.id,
          reference_id: booking.id,
        })
      )
    );
  } catch (err) {
    console.error("Staff/Admin notification fallback error:", err.message);
  }
}

async function notifyStaffAndAdminStatusUpdate(booking, title, message, type) {
  try {
    const receivers = await getStaffAndAdminProfiles();

    if (receivers.length === 0) return;

    await Promise.all(
      receivers.map((person) =>
        safeCreateNotification({
          user_id: person.id,
          target_role: String(person.role || "").toLowerCase(),
          title,
          message,
          type,
          booking_id: booking.id,
          reference_id: booking.id,
        })
      )
    );
  } catch (err) {
    console.error("Staff/Admin status notification error:", err.message);
  }
}

async function getBookingById(id) {
  if (!id) throw new Error("Missing booking ID.");

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Booking not found.");

  return data;
}

function validatePendingBooking(booking) {
  const currentStatus = normalizeStatus(booking.status);

  if (["approved", "rejected", "cancelled"].includes(currentStatus)) {
    throw new Error("This booking request is no longer pending.");
  }
}

async function updateBookingWithFallback(id, primaryPayload, fallbackPayload) {
  const { data, error } = await supabase
    .from("bookings")
    .update(primaryPayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (!error) return data;

  const errorMessage = String(error.message || "").toLowerCase();

  const likelyMissingColumn =
    errorMessage.includes("column") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("could not find");

  if (!likelyMissingColumn) throw error;

  console.warn("Retrying booking update without optional fields:", error.message);

  const retry = await supabase
    .from("bookings")
    .update(fallbackPayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (retry.error) throw retry.error;

  return retry.data;
}

async function findConflictingBooking({
  facilityId,
  bookingDate,
  startTime,
  endTime,
  statuses = ["approved"],
  excludeBookingId = null,
}) {
  if (!facilityId || !bookingDate || !startTime || !endTime) return null;

  let query = supabase
    .from("bookings")
    .select("id, facility_id, booking_date, start_time, end_time, status")
    .eq("facility_id", facilityId)
    .eq("booking_date", bookingDate)
    .in("status", statuses);

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const conflict = (data || []).find((booking) =>
    timesOverlap(startTime, endTime, booking.start_time, booking.end_time)
  );

  return conflict || null;
}

async function validateNoBookingConflict({
  facilityId,
  bookingDate,
  startTime,
  endTime,
  statuses = ["approved"],
  excludeBookingId = null,
}) {
  validateNotPastDate(bookingDate);
  validateTimeRange(startTime, endTime);

  const conflict = await findConflictingBooking({
    facilityId,
    bookingDate,
    startTime,
    endTime,
    statuses,
    excludeBookingId,
  });

  if (conflict) {
    throw new Error("This time slot is already taken. Please select another slot.");
  }

  return true;
}

async function getOverlappingPendingBookings(approvedBooking) {
  if (!approvedBooking?.id) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("facility_id", approvedBooking.facility_id)
    .eq("booking_date", approvedBooking.booking_date)
    .eq("status", "pending")
    .neq("id", approvedBooking.id);

  if (error) throw error;

  return (data || []).filter((booking) =>
    timesOverlap(
      approvedBooking.start_time,
      approvedBooking.end_time,
      booking.start_time,
      booking.end_time
    )
  );
}

async function autoRejectOverlappingPendingBookings(approvedBooking) {
  const conflictingPendingBookings = await getOverlappingPendingBookings(
    approvedBooking
  );

  if (conflictingPendingBookings.length === 0) return [];

  const autoRejectReason =
    "This booking request was automatically rejected because the selected time slot has already been approved for another user.";

  const rejectedBookings = [];

  for (const booking of conflictingPendingBookings) {
    const basePayload = {
      status: "rejected",
      facility_approval_status: "rejected",
      coach_approval_status: "not_required",
      includes_coach: false,
      linked_coach_id: null,
      coach_rate_per_hour: 0,
      coach_session_mode: null,
      coach_participants: 1,
    };

    const payloadWithReason = {
      ...basePayload,
      rejection_reason: autoRejectReason,
    };

    const rejectedBooking = await updateBookingWithFallback(
      booking.id,
      payloadWithReason,
      basePayload
    );

    if (rejectedBooking?.user_id) {
      await safeCreateNotification({
        user_id: rejectedBooking.user_id,
        target_role: "user",
        title: "Booking Rejected",
        message:
          "Your facility booking was rejected because the time slot has already been booked.",
        type: "booking_update",
        booking_id: rejectedBooking.id,
        reference_id: rejectedBooking.id,
      });
    }

    rejectedBookings.push({
      ...rejectedBooking,
      rejection_reason: rejectedBooking?.rejection_reason || autoRejectReason,
    });
  }

  return rejectedBookings;
}

export async function createBooking(payload) {
  const totalHours = Number(payload.total_hours || 0);
  const ratePerHour = Number(payload.rate_per_hour || 0);
  const facilityTotal = totalHours * ratePerHour;

  if (!payload.user_id) throw new Error("Missing user account.");
  if (!payload.facility_id) throw new Error("Please select a facility.");
  if (!payload.booking_date) throw new Error("Please select a booking date.");
  if (!payload.start_time || !payload.end_time) {
    throw new Error("Please select a valid time slot.");
  }

  if (totalHours <= 0) {
    throw new Error("Please select at least one valid booking hour.");
  }

  await validateNoBookingConflict({
    facilityId: payload.facility_id,
    bookingDate: payload.booking_date,
    startTime: payload.start_time,
    endTime: payload.end_time,
    statuses: ["approved"],
  });

  const { data: facilityBooking, error } = await supabase
    .from("bookings")
    .insert([
      {
        user_id: payload.user_id,
        facility_id: payload.facility_id,
        booking_date: payload.booking_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        session_type: payload.session_type || "recreational",
        notes: payload.notes || "",

        total_hours: totalHours,
        rate_per_hour: ratePerHour,
        total_amount: facilityTotal,

        includes_coach: false,
        linked_coach_id: null,
        coach_rate_per_hour: 0,
        coach_session_mode: null,
        coach_participants: 1,

        status: "pending",
        facility_approval_status: "pending",
        coach_approval_status: "not_required",
      },
    ])
    .select("*")
    .single();

  if (error) throw error;

  await notifyStaffAndAdmin(facilityBooking);

  return facilityBooking;
}

export async function getUserBookings(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*, facilities (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
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

export async function approveBooking(id) {
  const booking = await getBookingById(id);
  validatePendingBooking(booking);

  await validateNoBookingConflict({
    facilityId: booking.facility_id,
    bookingDate: booking.booking_date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    statuses: ["approved"],
    excludeBookingId: booking.id,
  });

  const updatePayload = {
    status: "approved",
    facility_approval_status: "approved",
    coach_approval_status: "not_required",
    includes_coach: false,
    linked_coach_id: null,
    coach_rate_per_hour: 0,
    coach_session_mode: null,
    coach_participants: 1,
  };

  const data = await updateBookingWithFallback(id, updatePayload, updatePayload);

  if (!data) throw new Error("Failed to approve booking.");

  if (data.user_id) {
    await safeCreateNotification({
      user_id: data.user_id,
      target_role: "user",
      title: "Booking Approved",
      message: "Your facility booking has been approved.",
      type: "booking_update",
      booking_id: data.id,
      reference_id: data.id,
    });
  }

  await autoRejectOverlappingPendingBookings(data);

  return data;
}

export async function rejectBooking(id, reason = "") {
  const booking = await getBookingById(id);
  validatePendingBooking(booking);

  const cleanReason = cleanText(reason);

  const basePayload = {
    status: "rejected",
    facility_approval_status: "rejected",
    coach_approval_status: "not_required",
    includes_coach: false,
    linked_coach_id: null,
    coach_rate_per_hour: 0,
    coach_session_mode: null,
    coach_participants: 1,
  };

  const payloadWithReason = {
    ...basePayload,
    rejection_reason: cleanReason,
  };

  const data = await updateBookingWithFallback(
    id,
    payloadWithReason,
    basePayload
  );

  if (!data) throw new Error("Failed to reject booking.");

  if (data.user_id) {
    await safeCreateNotification({
      user_id: data.user_id,
      target_role: "user",
      title: "Booking Rejected",
      message: cleanReason
        ? `Your facility booking has been rejected. Reason: ${cleanReason}`
        : "Your facility booking has been rejected.",
      type: "booking_update",
      booking_id: data.id,
      reference_id: data.id,
    });
  }

  return {
    ...data,
    rejection_reason: data.rejection_reason || cleanReason,
  };
}

export async function cancelBooking(bookingId, reason = "") {
  if (!bookingId) throw new Error("Missing booking ID.");

  const cleanReason = cleanText(reason);

  const basePayload = {
    status: "cancelled",
    facility_approval_status: "cancelled",
    coach_approval_status: "not_required",
    includes_coach: false,
    linked_coach_id: null,
    coach_rate_per_hour: 0,
    coach_session_mode: null,
    coach_participants: 1,
  };

  const payloadWithReason = {
    ...basePayload,
    cancellation_reason: cleanReason,
  };

  const { data, error } = await supabase
    .from("bookings")
    .update(payloadWithReason)
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (!error && data) {
    await notifyStaffAndAdminStatusUpdate(
      data,
      "Booking Cancelled",
      cleanReason
        ? `A user cancelled a pending facility booking. Reason: ${cleanReason}`
        : "A user cancelled a pending facility booking.",
      "booking_cancelled"
    );

    return data;
  }

  if (error) {
    const errorMessage = String(error.message || "").toLowerCase();

    const likelyMissingColumn =
      errorMessage.includes("column") ||
      errorMessage.includes("schema cache") ||
      errorMessage.includes("could not find");

    if (!likelyMissingColumn) throw error;

    console.warn(
      "Retrying booking cancellation without optional fields:",
      error.message
    );

    const retry = await supabase
      .from("bookings")
      .update(basePayload)
      .eq("id", bookingId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (retry.error) throw retry.error;

    if (!retry.data) {
      throw new Error("Only pending bookings can be cancelled.");
    }

    await notifyStaffAndAdminStatusUpdate(
      retry.data,
      "Booking Cancelled",
      cleanReason
        ? `A user cancelled a pending facility booking. Reason: ${cleanReason}`
        : "A user cancelled a pending facility booking.",
      "booking_cancelled"
    );

    return {
      ...retry.data,
      cancellation_reason: cleanReason,
    };
  }

  throw new Error("Only pending bookings can be cancelled.");
}