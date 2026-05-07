import { supabase } from "./supabaseClient";

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserBookings(userId) {
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
    .select("*, facilities (*)")
    .order("created_at", { ascending: false });

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
    session_type: payload.session_type || "recreational",
    notes: payload.notes || "",
    status: "pending",

    total_hours: payload.total_hours || 0,
    rate_per_hour: payload.rate_per_hour || 0,
    total_amount: payload.total_amount || 0,

    includes_coach: payload.includes_coach || false,
    linked_coach_id: payload.linked_coach_id || null,
    coach_rate_per_hour: payload.coach_rate_per_hour || 0,
    coach_session_mode: payload.coach_session_mode || null,
    coach_participants: payload.coach_participants || 1,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;

  await notifyStaffAndAdmin(data);

  return data;
}

async function notifyStaffAndAdmin(booking) {
  const { data: receivers, error } = await supabase
    .from("profiles")
    .select("id, role")
    .in("role", ["staff", "admin"]);

  if (error) {
    console.error("Fetch staff/admin error:", error.message);
    return;
  }

  if (!receivers?.length) return;

  await Promise.all(
    receivers.map((receiver) =>
      supabase.rpc("create_notification_rpc", {
        p_user_id: receiver.id,
        p_target_role: receiver.role,
        p_title: "Booking Request",
        p_message: "A user submitted a new facility booking request.",
        p_type: "booking_request",
        p_reference_id: booking.id,
      })
    )
  );
}

export async function approveBooking(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "approved" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "This booking cannot be approved because it is no longer pending."
    );
  }

  if (data?.user_id) {
    await supabase.rpc("create_notification_rpc", {
      p_user_id: data.user_id,
      p_target_role: "user",
      p_title: "Booking Approved",
      p_message: "Your facility booking has been approved.",
      p_type: "booking_update",
      p_reference_id: data.id,
    });
  }

  return data;
}

export async function rejectBooking(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "This booking cannot be rejected because it is no longer pending."
    );
  }

  if (data?.user_id) {
    await supabase.rpc("create_notification_rpc", {
      p_user_id: data.user_id,
      p_target_role: "user",
      p_title: "Booking Rejected",
      p_message: "Your facility booking has been rejected.",
      p_type: "booking_update",
      p_reference_id: data.id,
    });
  }

  return data;
}

export async function cancelBooking(bookingId, reason = "") {
  if (!bookingId) {
    throw new Error("Missing booking ID.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "",
    })
    .match({ id: bookingId })
    .select("*");

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error(
      "Booking not found or could not be cancelled. Check your bookings RLS update policy."
    );
  }

  return data[0];
}