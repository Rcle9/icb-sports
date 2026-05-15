import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";

import {
  approveCoachBooking,
  getAllCoachBookings,
  rejectCoachBooking,
} from "../../services/coachingService";

export default function CoachBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      setLoading(true);

      const data = await getAllCoachBookings();

      setBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await approveCoachBooking(id);

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? { ...booking, status: "approved" }
            : booking
        )
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await rejectCoachBooking(id);

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? { ...booking, status: "rejected" }
            : booking
        )
      );
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F3F1]">
      <Sidebar role="staff" />

      <div className="ml-[260px] p-8">
        <Topbar />

        <div className="rounded-[32px] bg-[#C97B6C] p-10 text-white shadow-lg">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            Coach Booking Center
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight">
            Review and manage coaching requests.
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-white/90">
            Staff can approve, reject, and monitor all incoming coaching
            reservations in realtime.
          </p>
        </div>

        <div className="mt-8 rounded-[30px] border border-[#E4DCD5] bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black text-[#2B2B2B]">
            Coaching Requests
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Review user coaching requests.
          </p>

          {loading && (
            <div className="mt-8 text-lg font-semibold text-slate-500">
              Loading requests...
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-[#D9C7C0] p-10 text-center text-slate-500">
              No coaching bookings found.
            </div>
          )}

          <div className="mt-8 space-y-5">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-3xl border border-[#E5DED8] bg-[#FFFDFC] p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      {booking.coaches?.name || "Coach"}
                    </h3>

                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>
                        Date:{" "}
                        <span className="font-semibold">
                          {booking.booking_date}
                        </span>
                      </p>

                      <p>
                        Time:{" "}
                        <span className="font-semibold">
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </p>

                      <p>
                        Status:{" "}
                        <span className="font-bold capitalize">
                          {booking.status}
                        </span>
                      </p>

                      <p>
                        Total:{" "}
                        <span className="font-bold text-[#C97B6C]">
                          ₱{booking.total_amount}
                        </span>
                      </p>

                      {booking.notes && (
                        <p>
                          Notes:{" "}
                          <span className="font-medium">
                            {booking.notes}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {booking.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => handleReject(booking.id)}
                        className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {booking.status !== "pending" && (
                    <div
                      className={`rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-wide ${
                        booking.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {booking.status}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}