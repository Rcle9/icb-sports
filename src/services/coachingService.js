import { supabase } from "./supabaseClient";

async function notifyUser(userId, title, message, referenceId) {
  if (!userId) return;

  try {
    await supabase.from("notifications").insert([
      {
        user_id: userId,
        title,
        message,
        type: "coaching_update",
        is_read: false,
        booking_id: referenceId,
      },
    ]);
  } catch (err) {
    console.error("User notification error:", err.message);
  }
}

export async function getCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .not("user_id", "is", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserCoachBookings(userId) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select("*, coaches (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCoachBooking(payload) {
  const cleanPayload = {
    user_id: payload.user_id,
    coach_id: payload.coach_id,
    facility_booking_id: payload.facility_booking_id || null,
    booking_date: payload.booking_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    session_mode: payload.session_mode || "one_on_one",
    participants: payload.participants || 1,
    notes: payload.notes || "",
    total_hours: payload.total_hours || 0,
    rate_per_hour: payload.rate_per_hour || 0,
    total_amount: payload.total_amount || 0,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("coach_bookings")
    .insert([cleanPayload])
    .select("*")
    .single();

  if (error) throw error;

  await notifyCoach(data);

  return data;
}

async function notifyCoach(coachBooking) {
  try {
    const { data: coach, error } = await supabase
      .from("coaches")
      .select("user_id")
      .eq("id", coachBooking.coach_id)
      .maybeSingle();

    if (error) throw error;
    if (!coach?.user_id) return;

    await supabase.from("notifications").insert([
      {
        user_id: coach.user_id,
        title: "New Coach Booking Request",
        message: "A user booked a coaching session with you.",
        type: "coach_booking",
        is_read: false,
        booking_id: coachBooking.facility_booking_id || coachBooking.id,
      },
    ]);
  } catch (err) {
    console.error("Coach notification error:", err.message);
  }
}

export async function getAllCoachBookings() {
  const { data, error } = await supabase
    .from("coach_bookings")
    .select("*, coaches (*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approveCoachBooking(id) {
  const { data: coachBooking, error } = await supabase
    .from("coach_bookings")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!coachBooking) {
    throw new Error("This coaching request is no longer pending.");
  }

  if (coachBooking.facility_booking_id) {
    const { data: facilityBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", coachBooking.facility_booking_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (facilityBooking) {
      const finalStatus =
        facilityBooking.facility_approval_status === "approved"
          ? "approved"
          : "pending";

      const { error: updateFacilityError } = await supabase
        .from("bookings")
        .update({
          coach_approval_status: "approved",
          status: finalStatus,
        })
        .eq("id", coachBooking.facility_booking_id);

      if (updateFacilityError) throw updateFacilityError;
    }
  }

  await notifyUser(
    coachBooking.user_id,
    "Coaching Approved",
    coachBooking.facility_booking_id
      ? "Your coach approved the coaching part of your booking."
      : "Your coaching booking has been approved.",
    coachBooking.facility_booking_id || coachBooking.id
  );

  return coachBooking;
}

export async function rejectCoachBooking(id) {
  const { data: coachBooking, error } = await supabase
    .from("coach_bookings")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!coachBooking) {
    throw new Error("This coaching request is no longer pending.");
  }

  if (coachBooking.facility_booking_id) {
    const { error: updateFacilityError } = await supabase
      .from("bookings")
      .update({
        coach_approval_status: "rejected",
        status: "rejected",
      })
      .eq("id", coachBooking.facility_booking_id);

    if (updateFacilityError) throw updateFacilityError;
  }

  await notifyUser(
    coachBooking.user_id,
    "Coaching Rejected",
    coachBooking.facility_booking_id
      ? "Your coach rejected the coaching part of your booking."
      : "Your coaching booking has been rejected.",
    coachBooking.facility_booking_id || coachBooking.id
  );

  return coachBooking;
}

export async function cancelCoachBooking(id, reason = "") {
  if (!id) {
    throw new Error("Missing coaching booking ID.");
  }

  const { data: coachBooking, error } = await supabase
    .from("coach_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "",
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!coachBooking) {
    throw new Error(
      "This coaching request cannot be cancelled because it is no longer pending."
    );
  }

  if (coachBooking.facility_booking_id) {
    const { error: updateFacilityError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        coach_approval_status: "cancelled",
        cancellation_reason: reason || "",
      })
      .eq("id", coachBooking.facility_booking_id)
      .eq("status", "pending");

    if (updateFacilityError) throw updateFacilityError;
  }

  return coachBooking;
}