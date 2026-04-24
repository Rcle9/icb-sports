import { supabase } from "./supabaseClient";

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUserBookings(userId) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      facilities (
        id,
        name,
        type,
        price,
        image_url,
        image_urls,
        description
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllBookings() {
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(`
      *,
      facilities (
        id,
        name,
        type,
        price,
        image_url,
        image_urls,
        description
      )
    `)
    .order("created_at", { ascending: false });

  if (bookingsError) throw bookingsError;

  const bookingRows = bookings || [];

  const userIds = [
    ...new Set(bookingRows.map((item) => item.user_id).filter(Boolean)),
  ];

  if (userIds.length === 0) {
    return bookingRows.map((item) => ({
      ...item,
      profiles: null,
    }));
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile])
  );

  return bookingRows.map((booking) => ({
    ...booking,
    profiles: profileMap.get(booking.user_id) || null,
  }));
}

export async function getApprovedBookingsByDate(facilityId, bookingDate) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("booking_date", bookingDate)
    .eq("status", "approved");

  if (error) throw error;
  return data || [];
}

export async function createBooking(payload) {
  const cleanPayload = {
    user_id: payload.user_id,
    facility_id: payload.facility_id,
    booking_date: payload.booking_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    session_type: payload.session_type || "facility",
    notes: payload.notes || "",
    status: "pending",
    total_hours: Number(payload.total_hours || 0),
    rate_per_hour: Number(payload.rate_per_hour || 0),
    coach_rate_per_hour: Number(payload.coach_rate_per_hour || 0),
    total_amount: Number(payload.total_amount || 0),
    includes_coach: payload.includes_coach || false,
    linked_coach_id: payload.linked_coach_id || null,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelBooking(bookingId, userId, reason) {
  const { data, error } = await supabase
    .from("bookings")
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
    throw new Error("Only pending bookings can be cancelled.");
  }

  return data[0];
}

export async function approveBooking(id, reviewedBy) {
  const { data, error } = await supabase
    .from("bookings")
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

export async function rejectBooking(id, reviewedBy) {
  const { data, error } = await supabase
    .from("bookings")
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

export async function getBookingStats() {
  const { data, error } = await supabase.from("bookings").select("status");

  if (error) throw error;

  const rows = data || [];

  return {
    total: rows.length,
    approved: rows.filter((item) => item.status === "approved").length,
    pending: rows.filter((item) => item.status === "pending").length,
    rejected: rows.filter((item) => item.status === "rejected").length,
    cancelled: rows.filter((item) => item.status === "cancelled").length,
  };
}