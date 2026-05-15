import { supabase } from "./supabaseClient";

export async function getCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
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
        p_title: "Coaching Request",
        p_message: "A user submitted a new coaching booking request.",
        p_type: "coaching_request",
        p_reference_id: booking.id,
      })
    )
  );
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
  const { data, error } = await supabase
    .from("coach_bookings")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("This coaching request cannot be approved because it is no longer pending.");
  }

  if (data?.user_id) {
    await supabase.rpc("create_notification_rpc", {
      p_user_id: data.user_id,
      p_target_role: "user",
      p_title: "Coaching Approved",
      p_message: "Your coaching booking has been approved.",
      p_type: "coaching_update",
      p_reference_id: data.id,
    });
  }

  return data;
}

export async function rejectCoachBooking(id) {
  const { data, error } = await supabase
    .from("coach_bookings")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("This coaching request cannot be rejected because it is no longer pending.");
  }

  if (data?.user_id) {
    await supabase.rpc("create_notification_rpc", {
      p_user_id: data.user_id,
      p_target_role: "user",
      p_title: "Coaching Rejected",
      p_message: "Your coaching booking has been rejected.",
      p_type: "coaching_update",
      p_reference_id: data.id,
    });
  }

  return data;
}

export async function cancelCoachBooking(id, reason = "") {
  if (!id) {
    throw new Error("Missing coaching booking ID.");
  }

  const { data, error } = await supabase
    .from("coach_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "",
    })
    .match({ id })
    .select("*");

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error(
      "Coaching booking not found or could not be cancelled. Check your coach_bookings RLS update policy."
    );
  }

  return data[0];
}