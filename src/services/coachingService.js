import { supabase } from "./supabaseClient";

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
  const { data, error } = await supabase
    .from("coach_bookings")
    .insert([
      {
        ...payload,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;

  const { data: receivers } = await supabase
    .from("profiles")
    .select("id, role")
    .in("role", ["staff", "admin"]);

  if (receivers?.length) {
    await Promise.all(
      receivers.map((person) =>
        supabase.rpc("create_notification_rpc", {
          p_user_id: person.id,
          p_target_role: person.role,
          p_title: "Coaching Request",
          p_message: "A user submitted a new coaching booking request.",
          p_type: "coaching_request",
          p_reference_id: data.id,
        })
      )
    );
  }

  return data;
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
  if (!data) throw new Error("This coaching request is no longer pending.");

  if (data.user_id) {
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
  if (!data) throw new Error("This coaching request is no longer pending.");

  if (data.user_id) {
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
  const { data, error } = await supabase
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
  if (!data) throw new Error("This coaching request is no longer pending.");

  return data;
}
