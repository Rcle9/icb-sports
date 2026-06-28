import { supabase } from "./supabaseClient";
import {
  createNotification,
  createStaffBookingNotifications,
} from "./notificationService";

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

async function notifyStaffAndAdmin(booking) {
  try {
    await createStaffBookingNotifications(booking.id);
    return;
  } catch (rpcError) {
    console.error("Staff booking notification RPC error:", rpcError.message);
  }

  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, role");

    if (error) throw error;

    const receivers = (profiles || []).filter((profile) => {
      const role = String(profile.role || "").toLowerCase();
      return role === "staff" || role === "admin";
    });

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

export async function createBooking(payload) {
  const facilityTotal =
    Number(payload.total_hours || 0) * Number(payload.rate_per_hour || 0);

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

        total_hours: payload.total_hours || 0,
        rate_per_hour: payload.rate_per_hour || 0,
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

export async function approveBooking(id) {
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!booking) throw new Error("Booking not found.");

  const currentStatus = String(booking.status || "pending").toLowerCase();

  if (["approved", "rejected", "cancelled"].includes(currentStatus)) {
    throw new Error("This booking request is no longer pending.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "approved",
      facility_approval_status: "approved",
      coach_approval_status: "not_required",
      includes_coach: false,
      linked_coach_id: null,
      coach_rate_per_hour: 0,
      coach_session_mode: null,
      coach_participants: 1,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
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

  return data;
}

export async function rejectBooking(id) {
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!booking) throw new Error("Booking not found.");

  const currentStatus = String(booking.status || "pending").toLowerCase();

  if (["approved", "rejected", "cancelled"].includes(currentStatus)) {
    throw new Error("This booking request is no longer pending.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "rejected",
      facility_approval_status: "rejected",
      coach_approval_status: "not_required",
      includes_coach: false,
      linked_coach_id: null,
      coach_rate_per_hour: 0,
      coach_session_mode: null,
      coach_participants: 1,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to reject booking.");

  if (data.user_id) {
    await safeCreateNotification({
      user_id: data.user_id,
      target_role: "user",
      title: "Booking Rejected",
      message: "Your facility booking has been rejected.",
      type: "booking_update",
      booking_id: data.id,
      reference_id: data.id,
    });
  }

  return data;
}

export async function cancelBooking(bookingId, reason = "") {
  if (!bookingId) throw new Error("Missing booking ID.");

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      facility_approval_status: "cancelled",
      coach_approval_status: "not_required",
      includes_coach: false,
      linked_coach_id: null,
      coach_rate_per_hour: 0,
      coach_session_mode: null,
      coach_participants: 1,
      cancellation_reason: reason || "",
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Only pending bookings can be cancelled.");
  }

  return data;
}