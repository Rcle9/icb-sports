import { supabase } from "./supabaseClient";

export async function updateBookingCompletionStatus({
  booking_id,
  staff_id,
  completion_status,
  completion_notes = "",
}) {
  const { data, error } = await supabase.rpc(
    "update_booking_completion_status",
    {
      p_booking_id: booking_id,
      p_staff_id: staff_id,
      p_completion_status: completion_status,
      p_completion_notes: completion_notes,
    }
  );

  if (error) {
    console.error("updateBookingCompletionStatus error:", error);
    throw error;
  }

  return data;
}

export function canCompleteBooking(booking) {
  if (!booking) return false;

  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const completionStatus = String(
    booking.completion_status || "not_completed"
  ).toLowerCase();

  if (completionStatus !== "not_completed") return false;

  if (status !== "approved") return false;
  if (paymentStatus !== "paid") return false;

  if (!booking.booking_date || !booking.end_time) return false;

  const endDateTime = new Date(
    `${booking.booking_date}T${String(booking.end_time).slice(0, 5)}:00`
  );

  return endDateTime.getTime() <= Date.now();
}

export function formatCompletionStatus(status) {
  const value = String(status || "not_completed").toLowerCase();

  if (value === "completed") return "Completed";
  if (value === "no_show") return "No-show";
  if (value === "cancelled_late") return "Cancelled Late";

  return "Not Completed";
}

export function getCompletionStatusClass(status) {
  const value = String(status || "not_completed").toLowerCase();

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}