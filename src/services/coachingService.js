import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";
import { createActivityLog } from "./activityLogService";

export async function getCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCoach(payload) {
  const { data, error } = await supabase
    .from("coaches")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.created_by || null,
    actor_role: "staff",
    action_type: "create",
    entity_type: "coach",
    entity_id: data.id,
    description: `Created coach profile: ${data.name}`,
    metadata: {
      specialty: data.specialty,
      is_active: data.is_active,
    },
  });

  return data;
}

export async function updateCoach(id, payload) {
  const { data: beforeCoach, error: beforeError } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("coaches")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.updated_by || null,
    actor_role: "staff",
    action_type: "update",
    entity_type: "coach",
    entity_id: data.id,
    description: `Updated coach profile: ${data.name}`,
    metadata: {
      before: {
        name: beforeCoach.name,
        specialty: beforeCoach.specialty,
        is_active: beforeCoach.is_active,
      },
      after: {
        name: data.name,
        specialty: data.specialty,
        is_active: data.is_active,
      },
    },
  });

  return data;
}

export async function getUserCoachBookings(userId) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select(`
      *,
      coaches (
        id,
        name,
        specialty
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllCoachBookings() {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select(`
      *,
      coaches (
        id,
        name,
        specialty
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getApprovedCoachBookingsByDate(coachId, bookingDate) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select("*")
    .eq("coach_id", coachId)
    .eq("booking_date", bookingDate)
    .eq("status", "approved")
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

export async function checkCoachOverlap({
  coach_id,
  booking_date,
  start_time,
  end_time,
  excludeId = null,
}) {
  let query = supabase
    .from("coach_bookings")
    .select("*")
    .eq("coach_id", coach_id)
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

export async function createCoachBooking(payload) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.user_id,
    actor_role: "user",
    action_type: "create",
    entity_type: "coaching",
    entity_id: data.id,
    description: "User submitted a coaching booking request.",
    metadata: {
      coach_id: data.coach_id,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      session_mode: data.session_mode,
      participants: data.participants,
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
          title: "New Coaching Request",
          message: "A new coaching request was submitted and needs approval.",
          type: "coaching_staff",
        })
      )
    );
  }

  return data;
}

export async function approveCoachBooking(bookingId, reviewerId) {
  const { data: booking, error: bookingError } = await supabase
    .from("coach_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError) throw bookingError;

  const overlaps = await checkCoachOverlap({
    coach_id: booking.coach_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    excludeId: booking.id,
  });

  if (overlaps.length > 0) {
    throw new Error(
      "Cannot approve this coaching request because the selected coach already has an approved overlapping session."
    );
  }

  const { data, error } = await supabase
    .from("coach_bookings")
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
    title: "Coaching Approved",
    message: "Your coaching session has been approved.",
    type: "coaching",
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
    entity_type: "coaching",
    entity_id: data.id,
    description: "Coaching booking approved.",
    metadata: {
      coach_id: data.coach_id,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      user_id: data.user_id,
    },
  });

  return data;
}

export async function rejectCoachBooking(bookingId, reviewerId) {
  const { data, error } = await supabase
    .from("coach_bookings")
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
    title: "Coaching Rejected",
    message: "Your coaching session was rejected.",
    type: "coaching",
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
    entity_type: "coaching",
    entity_id: data.id,
    description: "Coaching booking rejected.",
    metadata: {
      coach_id: data.coach_id,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      user_id: data.user_id,
    },
  });

  return data;
}