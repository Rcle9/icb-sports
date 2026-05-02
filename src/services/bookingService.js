import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";

export const SESSION_TYPES = ["training", "instructional", "recreational"];

// ==============================
// FACILITIES
// ==============================
export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFacilityById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// ==============================
// BOOKINGS GETTERS
// ==============================
export async function getAllBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, facilities (*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBookings() {
  return getAllBookings();
}

export async function fetchBookings() {
  return getAllBookings();
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

export async function getMyBookings(userId) {
  return getUserBookings(userId);
}

export async function getPendingBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, facilities (*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getApprovedBookingsByDate(facilityId, bookingDate) {
  if (!facilityId || !bookingDate) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("booking_date", bookingDate)
    .eq("status", "approved");

  if (error) throw error;
  return data || [];
}

export async function getAvailableSlots(facilityId, bookingDate) {
  return getApprovedBookingsByDate(facilityId, bookingDate);
}

// ==============================
// NOTIFICATION HELPERS
// ==============================
async function notifyStaffAndAdmin({ title, message, type, reference_id }) {
  const { data: receivers, error } = await supabase
    .from("profiles")
    .select("id, role")
    .in("role", ["staff", "admin"]);

  if (error) throw error;

  await Promise.all(
    (receivers || []).map((person) =>
      createNotification({
        user_id: person.id,
        target_role: person.role,
        title,
        message,
        type,
        reference_id,
      })
    )
  );
}

async function notifyBookingOwner({ userId, title, message, type, reference_id }) {
  if (!userId) return;

  await createNotification({
    user_id: userId,
    target_role: "user",
    title,
    message,
    type,
    reference_id,
  });
}

// ==============================
// CREATE BOOKING
// Booking Request = Staff/Admin only
// ==============================
export async function createBooking(payload) {
  const sessionType = payload.session_type || "training";

  if (!SESSION_TYPES.includes(sessionType)) {
    throw new Error("Invalid session type.");
  }

  const cleanPayload = {
    user_id: payload.user_id,
    facility_id: payload.facility_id,
    booking_date: payload.booking_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    session_type: sessionType,
    notes: payload.notes || "",
    status: payload.status || "pending",

    total_hours: Number(payload.total_hours || 0),
    rate_per_hour: Number(payload.rate_per_hour || 0),
    total_amount: Number(payload.total_amount || 0),

    includes_coach: Boolean(payload.includes_coach),
    linked_coach_id: payload.linked_coach_id || null,
    coach_rate_per_hour: Number(payload.coach_rate_per_hour || 0),

    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([cleanPayload])
    .select()
    .maybeSingle();

  if (error) throw error;

  const booking = data;

  if (cleanPayload.includes_coach && cleanPayload.linked_coach_id) {
    const coachPayload = {
      user_id: cleanPayload.user_id,
      coach_id: cleanPayload.linked_coach_id,
      booking_date: cleanPayload.booking_date,
      start_time: cleanPayload.start_time,
      end_time: cleanPayload.end_time,
      session_mode: payload.coach_session_mode || "one_on_one",
      participants: Number(payload.coach_participants || 1),
      notes: `Booked with facility booking${booking?.id ? `: ${booking.id}` : ""}`,
      status: "pending",
      total_hours: cleanPayload.total_hours,
      rate_per_hour: cleanPayload.coach_rate_per_hour,
      total_amount:
        cleanPayload.total_hours * Number(cleanPayload.coach_rate_per_hour || 0),
      created_at: new Date().toISOString(),
    };

    const { error: coachError } = await supabase
      .from("coach_bookings")
      .insert([coachPayload]);

    if (coachError) throw coachError;
  }

  await notifyStaffAndAdmin({
    title: "New Booking Request",
    message: cleanPayload.includes_coach
      ? "A user submitted a facility and coach booking request."
      : "A user submitted a facility booking request.",
    type: "booking_request",
    reference_id: booking?.id || null,
  });

  return booking;
}

// ==============================
// UPDATE / APPROVE / REJECT
// Booking Update = User only
// ==============================
export async function updateBookingStatus(bookingId, status) {
  if (!bookingId) throw new Error("Booking ID is required.");

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select("*, facilities (*)")
    .maybeSingle();

  if (error) throw error;

  const booking = data;

  await notifyBookingOwner({
    userId: booking?.user_id,
    title: "Booking Update",
    message:
      status === "approved"
        ? "Your booking has been approved."
        : status === "rejected"
        ? "Your booking has been rejected."
        : status === "cancelled"
        ? "Your booking has been cancelled."
        : `Your booking status was updated to ${status}.`,
    type: "booking_update",
    reference_id: booking?.id || bookingId,
  });

  return booking;
}

export async function approveBooking(bookingId) {
  return updateBookingStatus(bookingId, "approved");
}

export async function rejectBooking(bookingId) {
  return updateBookingStatus(bookingId, "rejected");
}

// ==============================
// CANCEL BOOKING
// User + Staff/Admin
// ==============================
export async function cancelBooking(bookingId, userId = null, reason = "") {
  if (!bookingId) throw new Error("Booking ID is required.");

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
    })
    .eq("id", bookingId)
    .select("*, facilities (*)")
    .maybeSingle();

  if (error) throw error;

  const booking = data;

  await notifyBookingOwner({
    userId: userId || booking?.user_id,
    title: "Booking Cancelled",
    message: "Your booking cancellation has been recorded.",
    type: "booking_update",
    reference_id: booking?.id || bookingId,
  });

  await notifyStaffAndAdmin({
    title: "Booking Cancelled",
    message: reason
      ? `A user cancelled a booking. Reason: ${reason}`
      : "A user cancelled a booking.",
    type: "booking_request",
    reference_id: booking?.id || bookingId,
  });

  return booking;
}

// ==============================
// DELETE BOOKING
// ==============================
export async function deleteBooking(id) {
  if (!id) throw new Error("Booking ID is required.");

  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) throw error;
  return true;
}