import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";
import { createActivityLog } from "./activityLogService";

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createBooking(payload) {
  const { data, error } = await supabase
    .from("bookings")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.user_id,
    actor_role: "user",
    action_type: "create",
    entity_type: "booking",
    entity_id: data.id,
    description: "User submitted a facility booking request.",
    metadata: {
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      facility_id: data.facility_id,
    },
  });

  const { data: staffProfiles, error: staffError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "staff");

  if (staffError) throw staffError;

  if (staffProfiles?.length) {
    await Promise.all(
      staffProfiles.map((staff) =>
        createNotification({
          user_id: staff.id,
          title: "New Booking Request",
          message: "A new facility booking request was submitted and needs review.",
          type: "booking_staff",
        })
      )
    );
  }

  return data;
}

export async function getUserBookings(userId) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      facilities (
        id,
        name,
        type
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      facilities (
        id,
        name,
        type
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getApprovedBookingsByDate(facilityId, bookingDate) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("booking_date", bookingDate)
    .eq("status", "approved")
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

export async function checkApprovedOverlap({
  facility_id,
  booking_date,
  start_time,
  end_time,
  excludeId = null,
}) {
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("facility_id", facility_id)
    .eq("booking_date", booking_date)
    .eq("status", "approved")
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function approveBooking(bookingId, reviewerId) {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError) throw bookingError;

  const overlaps = await checkApprovedOverlap({
    facility_id: booking.facility_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    excludeId: booking.id,
  });

  if (overlaps.length > 0) {
    throw new Error(
      "Cannot approve this booking because the slot overlaps with an approved booking."
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  await createNotification({
    user_id: data.user_id,
    title: "Booking Approved",
    message: "Your facility booking has been approved.",
    type: "booking",
  });

  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", reviewerId)
    .maybeSingle();

  await createActivityLog({
    actor_id: reviewerId,
    actor_role: reviewer?.role || "staff",
    action_type: "approve",
    entity_type: "booking",
    entity_id: data.id,
    description: "Facility booking approved.",
    metadata: {
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      facility_id: data.facility_id,
      user_id: data.user_id,
    },
  });

  return data;
}

export async function rejectBooking(bookingId, reviewerId) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;

  await createNotification({
    user_id: data.user_id,
    title: "Booking Rejected",
    message: "Your facility booking was rejected.",
    type: "booking",
  });

  const { data: reviewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", reviewerId)
    .maybeSingle();

  await createActivityLog({
    actor_id: reviewerId,
    actor_role: reviewer?.role || "staff",
    action_type: "reject",
    entity_type: "booking",
    entity_id: data.id,
    description: "Facility booking rejected.",
    metadata: {
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      facility_id: data.facility_id,
      user_id: data.user_id,
    },
  });

  return data;
}