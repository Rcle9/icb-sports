import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  getAllCoachBookings,
  approveCoachBooking,
  rejectCoachBooking,
} from "../../services/coachingService";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function statusClass(status) {
  const value = String(status || "pending").toLowerCase();

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function CoachBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`staff-coach-bookings-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadBookings() {
    try {
      setError("");
      const data = await getAllCoachBookings();
      setBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load coach bookings.");
    }
  }

  async function handleApprove(id) {
    try {
      setError("");
      await approveCoachBooking(id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to approve coach booking.");
    }
  }

  async function handleReject(id) {
    try {
      setError("");
      await rejectCoachBooking(id);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Failed to reject coach booking.");
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coach Booking Requests" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Coaching Approval</p>

            <h2 className="mt-2 text-3xl font-black">
              Review coaching requests from users.
            </h2>

            <p className="mt-2 text-sm text-white/90">
              Staff view only. Coach approval is handled by the assigned coach.
            </p>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-black text-[#2B2B2B]">
              Coaching Requests
            </h3>

            <div className="mt-6 space-y-4">
              {bookings.length === 0 ? (
                <p className="text-slate-500">
                  No coaching booking requests yet.
                </p>
              ) : (
                bookings.map((booking) => {
                  const status = String(
                    booking.status || "pending"
                  ).toLowerCase();

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-[#DED8D2] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                          <h4 className="mt-3 text-xl font-black text-[#2B2B2B]">
                            {booking.coaches?.name || "Coach Session"}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            {booking.booking_date} •{" "}
                            {cleanTime(booking.start_time)} -{" "}
                            {cleanTime(booking.end_time)}
                          </p>

                          <p className="mt-3 text-sm">
                            Session Mode:{" "}
                            <b>{booking.session_mode || "one_on_one"}</b>
                          </p>

                          <p className="text-sm">
                            Participants: <b>{booking.participants || 1}</b>
                          </p>

                          <p className="text-sm">
                            Notes: {booking.notes || "-"}
                          </p>

                          {booking.facility_booking_id && (
                            <p className="mt-2 text-sm font-semibold text-[#C97B6C]">
                              Linked Facility Booking:{" "}
                              {booking.facility_booking_id}
                            </p>
                          )}

                          {status === "cancelled" &&
                            booking.cancellation_reason && (
                              <p className="mt-2 text-sm text-slate-500">
                                Cancellation reason:{" "}
                                {booking.cancellation_reason}
                              </p>
                            )}

                          <p className="mt-2 text-sm font-black text-[#C97B6C]">
                            Total: {money(booking.total_amount)}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 md:items-end">
                          {status === "pending" ? (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApprove(booking.id)}
                                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() => handleReject(booking.id)}
                                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-500">
                              {status === "cancelled"
                                ? "Cancelled by user"
                                : "Reviewed"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}