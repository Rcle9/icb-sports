import { supabase } from "./supabaseClient";

async function notifyStaffAndAdmin(booking) {
  try {
    const { data: receivers } = await supabase
      .from("profiles")
      .select("id, role")
      .in("role", ["staff", "admin"]);

    if (!receivers?.length) return;

    await supabase.from("notifications").insert(
      receivers.map((person) => ({
        user_id: person.id,
        title: "New Facility Booking",
        message: "A new facility booking request was submitted.",
        type: "booking",
        is_read: false,
        booking_id: booking.id,
      }))
    );
  } catch (err) {
    console.error("Staff notification error:", err.message);
  }
}

async function notifyCoach(coachBooking) {
  try {
    const { data: coach } = await supabase
      .from("coaches")
      .select("user_id")
      .eq("id", coachBooking.coach_id)
      .maybeSingle();

    if (!coach?.user_id) return;

    await supabase.from("notifications").insert([
      {
        user_id: coach.user_id,
        title: "New Coach Booking Request",
        message: "A user booked you with a facility booking.",
        type: "coach_booking",
        is_read: false,
        booking_id: coachBooking.facility_booking_id,
      },
    ]);
  } catch (err) {
    console.error("Coach notification error:", err.message);
  }
}

export async function createBooking(payload) {
  const hasCoach = Boolean(payload.includes_coach && payload.linked_coach_id);

  const facilityTotal =
    Number(payload.total_hours || 0) * Number(payload.rate_per_hour || 0);

  const coachTotal = hasCoach
    ? Number(payload.total_hours || 0) *
      Number(payload.coach_rate_per_hour || 0)
    : 0;

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
        total_amount: facilityTotal + coachTotal,

        includes_coach: hasCoach,
        linked_coach_id: hasCoach ? payload.linked_coach_id : null,
        coach_rate_per_hour: hasCoach ? payload.coach_rate_per_hour || 0 : 0,
        coach_session_mode: hasCoach
          ? payload.coach_session_mode || "one_on_one"
          : null,
        coach_participants: hasCoach ? payload.coach_participants || 1 : 1,

        status: "pending",
        facility_approval_status: "pending",
        coach_approval_status: hasCoach ? "pending" : "not_required",
      },
    ])
    .select("*")
    .single();

  if (error) throw error;

  await notifyStaffAndAdmin(facilityBooking);

  if (hasCoach) {
    const { data: coachBooking, error: coachError } = await supabase
      .from("coach_bookings")
      .insert([
        {
          user_id: payload.user_id,
          coach_id: payload.linked_coach_id,
          facility_booking_id: facilityBooking.id,
          booking_date: payload.booking_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          session_mode: payload.coach_session_mode || "one_on_one",
          participants: payload.coach_participants || 1,
          notes: `Booked with facility booking: ${facilityBooking.id}`,
          total_hours: payload.total_hours || 0,
          rate_per_hour: payload.coach_rate_per_hour || 0,
          total_amount: coachTotal,
          status: "pending",
        },
      ])
      .select("*")
      .single();

    if (coachError) throw coachError;

    await notifyCoach(coachBooking);
  }

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

  const finalStatus =
    booking.includes_coach && booking.coach_approval_status !== "approved"
      ? "pending"
      : "approved";

  const { data, error } = await supabase
    .from("bookings")
    .update({
      facility_approval_status: "approved",
      status: finalStatus,
    })
    .eq("id", id)
    .eq("facility_approval_status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("This booking request is no longer pending.");
  }

  if (data.user_id) {
    await supabase.from("notifications").insert([
      {
        user_id: data.user_id,
        title:
          data.status === "approved"
            ? "Booking Approved"
            : "Facility Approved",
        message:
          data.status === "approved"
            ? "Your booking has been fully approved."
            : "Your facility booking was approved. Waiting for coach approval.",
        type: "booking_update",
        is_read: false,
        booking_id: data.id,
      },
    ]);
  }

  return data;
}

export async function rejectBooking(id) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      facility_approval_status: "rejected",
      status: "rejected",
    })
    .eq("id", id)
    .eq("facility_approval_status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("This booking request is no longer pending.");
  }

  await supabase
    .from("coach_bookings")
    .update({ status: "rejected" })
    .eq("facility_booking_id", id)
    .eq("status", "pending");

  if (data.user_id) {
    await supabase.from("notifications").insert([
      {
        user_id: data.user_id,
        title: "Booking Rejected",
        message: "Your facility booking has been rejected.",
        type: "booking_update",
        is_read: false,
        booking_id: data.id,
      },
    ]);
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
      coach_approval_status: "cancelled",
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

  await supabase
    .from("coach_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "",
    })
    .eq("facility_booking_id", bookingId)
    .eq("status", "pending");

  return data;
}