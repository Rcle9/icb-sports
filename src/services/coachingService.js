import { supabase } from "./supabaseClient";

export async function getCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCoach(payload) {
  const cleanPayload = {
    name: payload.name,
    specialty: payload.specialty,
    bio: payload.bio || "",
    experience: payload.experience || "",
    image_url: payload.image_url || "",
    rate_per_hour: Number(payload.rate_per_hour || 0),
    is_active: payload.is_active ?? true,
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  const { data, error } = await supabase
    .from("coaches")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCoach(id, payload) {
  const cleanPayload = {
    ...payload,
    rate_per_hour:
      payload.rate_per_hour !== undefined
        ? Number(payload.rate_per_hour || 0)
        : undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) delete cleanPayload[key];
  });

  const { data, error } = await supabase
    .from("coaches")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCoach(id) {
  const { error } = await supabase.from("coaches").delete().eq("id", id);

  if (error) throw error;
  return true;
}

export async function getAllCoachBookings() {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select(`
      *,
      coaches (
        id,
        name,
        specialty,
        image_url,
        rate_per_hour
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approveCoachBooking(id, reviewedBy) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .update({
      status: "approved",
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectCoachBooking(id, reviewedBy) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
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
        specialty,
        image_url,
        rate_per_hour
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getApprovedCoachBookingsByDate(coachId, bookingDate) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select("*")
    .eq("coach_id", coachId)
    .eq("booking_date", bookingDate)
    .eq("status", "approved");

  if (error) throw error;
  return data || [];
}

export async function createCoachBooking(payload) {
  const cleanPayload = {
    user_id: payload.user_id,
    coach_id: payload.coach_id,
    booking_date: payload.booking_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    session_mode: payload.session_mode || "one_on_one",
    participants: Number(payload.participants || 1),
    notes: payload.notes || "",
    status: "pending",
    total_hours: Number(payload.total_hours || 0),
    rate_per_hour: Number(payload.rate_per_hour || 0),
    total_amount: Number(payload.total_amount || 0),
  };

  const { data, error } = await supabase
    .from("coach_bookings")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelCoachBooking(bookingId, userId, reason) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("Only pending coaching bookings can be cancelled.");
  }

  return data[0];
}