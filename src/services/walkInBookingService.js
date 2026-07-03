import { supabase } from "./supabaseClient";

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
}

function getTotalAmount(payload) {
  const totalHours = Number(payload.total_hours || 0);
  const ratePerHour = Number(payload.rate_per_hour || 0);
  const totalAmount = Number(payload.total_amount || 0);

  if (totalAmount > 0) return totalAmount;

  return totalHours * ratePerHour;
}

export async function createWalkInBooking(payload) {
  const totalAmount = getTotalAmount(payload);

  const { data, error } = await supabase.rpc(
    "create_walk_in_booking_with_conflict_check",
    {
      p_staff_id: payload.staff_id,
      p_facility_id: payload.facility_id,
      p_booking_date: String(payload.booking_date),
      p_start_time: cleanTime(payload.start_time),
      p_end_time: cleanTime(payload.end_time),
      p_customer_name: payload.customer_name || "Walk-in Customer",
      p_contact_number: payload.contact_number || "",
      p_session_type: payload.session_type || "recreational",
      p_notes: payload.notes || "",
      p_total_hours: Number(payload.total_hours || 0),
      p_rate_per_hour: Number(payload.rate_per_hour || 0),
      p_total_amount: totalAmount,
      p_payment_method: payload.payment_method || "Cash",
      p_payment_reference: payload.payment_reference || "",
      p_amount_paid: Number(payload.amount_paid || totalAmount),
    }
  );

  if (error) {
    console.error("createWalkInBooking RPC error:", error);
    throw error;
  }

  return data;
}