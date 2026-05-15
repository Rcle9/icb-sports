import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { cancelBooking } from "../../services/bookingService";
import { cancelCoachBooking } from "../../services/coachingService";
import { useAuth } from "../../context/AuthContext";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time24) {
  if (!time24) return "";

  const [h, m] = cleanTime(time24).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

export default function Coaching() {
  const { user, profile } = useAuth();

  const [facilityBookings, setFacilityBookings] = useState([]);
  const [coachBookings, setCoachBookings] = useState([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [cancelModal, setCancelModal] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const allBookings = useMemo(() => {
    const facility = facilityBookings.map((booking) => ({
      ...booking,
      booking_source: booking.includes_coach ? "facility_coach" : "facility",
      display_title: booking.facilities?.name || "Facility Booking",
      display_type: booking.includes_coach
        ? "Facility + Coach Booking"
        : "Facility Booking",
      display_rate: booking.rate_per_hour,
      display_total: booking.total_amount,
      source_table: "bookings",
    }));

    const coachOnly = coachBookings
      .filter((booking) => !booking.facility_booking_id)
      .map((booking) => ({
        ...booking,
        booking_source: "coach",
        display_title: booking.coaches?.name || "Coach Booking",
        display_type: "Coach Booking",
        display_rate: booking.rate_per_hour,
        display_total: booking.total_amount,
        source_table: "coach_bookings",
      }));

    return [...facility, ...coachOnly].sort((a, b) => {
      return (
        new Date(b.created_at || b.booking_date) -
        new Date(a.created_at || a.booking_date)
      );
    });
  }, [facilityBookings, coachBookings]);

  useEffect(() => {
    if (user?.id) loadBookings();
  }, [user?.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`my-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadBookings()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_bookings" },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadBookings() {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: facilityData, error: facilityError } = await supabase
        .from("bookings")
        .select("*, facilities (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (facilityError) throw facilityError;

      const { data: coachData, error: coachError } = await supabase
        .from("coach_bookings")
        .select("*, coaches (*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (coachError) throw coachError;

      setFacilityBookings(facilityData || []);
      setCoachBookings(coachData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    }
  }

  async function handleCancel() {
    if (!selectedCancelBooking?.id) return;

    try {
      setCancelling(true);
      setError("");
      setMessage("");

      if (selectedCancelBooking.source_table === "bookings") {
        await cancelBooking(selectedCancelBooking.id, cancelReason);
      } else {
        await cancelCoachBooking(selectedCancelBooking.id, cancelReason);
      }

      setMessage("Booking request cancelled successfully.");
      setCancelModal(false);
      setSelectedCancelBooking(null);
      setCancelReason("");

      await loadBookings();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  function statusClass(status) {
    const value = normalizeStatus(status);

    if (value === "approved") return "bg-green-100 text-green-700";
    if (value === "rejected") return "bg-red-100 text-red-700";
    if (value === "cancelled") return "bg-slate-200 text-slate-700";
    return "bg-yellow-100 text-yellow-700";
  }

  return (
    <div className="page-shell">
      <Sidebar role={profile?.role === "coach" ? "coach" : "user"} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="My Bookings" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">My Booking Requests</p>
            <h2 className="mt-2 text-3xl font-black">
              Track all facility and coaching requests.
            </h2>
            <p className="mt-2 text-sm text-white/90">
              Facility + coach bookings need approval from both staff and coach.
            </p>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  All My Bookings
                </h3>
                <p className="text-sm text-slate-500">
                  Your facility, coach, and combined booking requests.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {allBookings.length} request(s)
              </span>
            </div>

            {allBookings.length === 0 ? (
              <p className="text-slate-500">No booking requests yet.</p>
            ) : (
              <div className="space-y-4">
                {allBookings.map((booking) => {
                  const status = normalizeStatus(booking.status);

                  return (
                    <div
                      key={`${booking.source_table}-${booking.id}`}
                      className="rounded-2xl border border-[#DED8D2] bg-white p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black uppercase text-[#C97B6C]">
                              {booking.display_type}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <h4 className="text-xl font-black text-[#2B2B2B]">
                            {booking.display_title}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            {booking.booking_date} •{" "}
                            {formatTime(booking.start_time)} -{" "}
                            {formatTime(booking.end_time)}
                          </p>

                          {booking.session_type && (
                            <p className="mt-2 text-sm">
                              Session Type:{" "}
                              <b className="capitalize">
                                {booking.session_type}
                              </b>
                            </p>
                          )}

                          {booking.session_mode && (
                            <p className="mt-2 text-sm">
                              Coach Mode:{" "}
                              <b className="capitalize">
                                {String(booking.session_mode).replace("_", " ")}
                              </b>
                            </p>
                          )}

                          {booking.includes_coach && (
                            <>
                              <p className="mt-2 text-sm font-semibold text-[#C97B6C]">
                                Includes Coach • Coach Rate:{" "}
                                {money(booking.coach_rate_per_hour || 0)} / hour
                              </p>

                              <p className="mt-1 text-sm">
                                Facility Approval:{" "}
                                <b className="capitalize">
                                  {booking.facility_approval_status || "pending"}
                                </b>
                              </p>

                              <p className="mt-1 text-sm">
                                Coach Approval:{" "}
                                <b className="capitalize">
                                  {booking.coach_approval_status || "pending"}
                                </b>
                              </p>
                            </>
                          )}

                          {booking.participants && (
                            <p className="mt-2 text-sm">
                              Participants: <b>{booking.participants}</b>
                            </p>
                          )}

                          {booking.coach_participants &&
                            booking.includes_coach && (
                              <p className="mt-2 text-sm">
                                Coach Participants:{" "}
                                <b>{booking.coach_participants}</b>
                              </p>
                            )}

                          {booking.notes && (
                            <p className="mt-2 text-sm text-slate-600">
                              Notes: {booking.notes}
                            </p>
                          )}

                          {status === "cancelled" &&
                            booking.cancellation_reason && (
                              <p className="mt-2 text-sm text-slate-500">
                                Cancellation reason:{" "}
                                {booking.cancellation_reason}
                              </p>
                            )}

                          <p className="mt-3 text-sm font-black">
                            Total: {money(booking.display_total || 0)}
                          </p>
                        </div>

                        <div>
                          {status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCancelBooking(booking);
                                setCancelModal(true);
                              }}
                              className="rounded-2xl bg-[#C65B5B] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                            >
                              Cancel Request
                            </button>
                          ) : (
                            <p className="text-sm font-bold text-slate-500">
                              {status === "cancelled"
                                ? "Cancelled"
                                : "Reviewed"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {cancelModal && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
                <h2 className="text-2xl font-black text-[#2B2B2B]">
                  Cancel Booking Request
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  You can only cancel requests that are still pending.
                </p>

                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation"
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 focus:border-[#C97B6C]"
                />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModal(false);
                      setSelectedCancelBooking(null);
                      setCancelReason("");
                    }}
                    className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="rounded-2xl bg-[#C65B5B] px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}