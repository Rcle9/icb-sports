import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  CreditCard,
  FileImage,
  Receipt,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function cleanTime(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function formatTime(time) {
  if (!time) return "-";

  const [h, m] = cleanTime(time).split(":");
  let hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${m} ${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility";
}

function getTimelineSteps(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  const isCancelled = status === "cancelled";
  const isRejected = status === "rejected";
  const isExpired = status === "expired" || paymentStatus === "expired";
  const isPaymentRejected = paymentStatus === "rejected_payment";

  if (isCancelled) {
    return [
      {
        key: "reserved",
        label: "Booking Created",
        description: "Your booking was created.",
        state: "done",
        icon: Clock,
      },
      {
        key: "cancelled",
        label: "Booking Cancelled",
        description: "This booking has been cancelled.",
        state: "failed",
        icon: XCircle,
      },
    ];
  }

  if (isRejected) {
    return [
      {
        key: "reserved",
        label: "Booking Created",
        description: "Your booking was created.",
        state: "done",
        icon: Clock,
      },
      {
        key: "rejected",
        label: "Booking Rejected",
        description: "This booking was rejected.",
        state: "failed",
        icon: XCircle,
      },
    ];
  }

  if (isExpired) {
    return [
      {
        key: "reserved",
        label: "Reserved",
        description: "The slot was temporarily reserved.",
        state: "done",
        icon: Clock,
      },
      {
        key: "expired",
        label: "Reservation Expired",
        description: "Payment was not completed before the reservation expired.",
        state: "failed",
        icon: XCircle,
      },
    ];
  }

  const steps = [
    {
      key: "reserved",
      label: "Reserved",
      description: "Your selected slot has been reserved.",
      state: ["reserved", "pending", "approved"].includes(status)
        ? "done"
        : "pending",
      icon: Clock,
    },
    {
      key: "payment_uploaded",
      label: "Payment Uploaded",
      description: "Payment proof has been submitted for verification.",
      state: ["pending_verification", "paid"].includes(paymentStatus)
        ? "done"
        : isPaymentRejected
        ? "failed"
        : "pending",
      icon: FileImage,
    },
    {
      key: "payment_verified",
      label: "Payment Verified",
      description: "Staff verified the uploaded payment proof.",
      state: paymentStatus === "paid" ? "done" : "pending",
      icon: CreditCard,
    },
    {
      key: "approved",
      label: "Booking Approved",
      description: "Your booking is approved and ready.",
      state: status === "approved" ? "done" : "pending",
      icon: CheckCircle,
    },
    {
      key: "receipt",
      label: "Receipt Issued",
      description: "Receipt is available after payment verification.",
      state: booking?.receipt_number ? "done" : "pending",
      icon: Receipt,
    },
  ];

  if (isPaymentRejected) {
    steps[1] = {
      key: "payment_rejected",
      label: "Payment Rejected",
      description: "Your payment proof was rejected. Please upload a valid proof again.",
      state: "failed",
      icon: XCircle,
    };
  }

  return steps;
}

function getOverallStatusTone(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (status === "approved" && paymentStatus === "paid") {
    return {
      label: "Approved",
      className: "bg-green-100 text-green-700",
    };
  }

  if (paymentStatus === "pending_verification") {
    return {
      label: "Payment Review",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "reserved") {
    return {
      label: "Reserved",
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  if (paymentStatus === "rejected_payment") {
    return {
      label: "Payment Rejected",
      className: "bg-red-100 text-red-700",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-slate-200 text-slate-700",
    };
  }

  if (status === "expired" || paymentStatus === "expired") {
    return {
      label: "Expired",
      className: "bg-orange-100 text-orange-700",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: formatStatusLabel(status),
    className: "bg-slate-100 text-slate-700",
  };
}

export default function BookingTimeline() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const highlightId = searchParams.get("highlight");

  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(highlightId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedBooking = useMemo(() => {
    return (
      bookings.find((booking) => String(booking.id) === String(selectedBookingId)) ||
      bookings[0] ||
      null
    );
  }, [bookings, selectedBookingId]);

  const timelineSteps = useMemo(() => {
    return selectedBooking ? getTimelineSteps(selectedBooking) : [];
  }, [selectedBooking]);

  useEffect(() => {
    if (!user?.id) return;

    loadBookings();

    const channel = supabase
      .channel(`user-booking-timeline-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadBookings(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (highlightId) {
      setSelectedBookingId(highlightId);
    }
  }, [highlightId]);

  async function loadBookings(showLoading = true) {
    try {
      if (!user?.id) return;

      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
  .from("bookings")
  .select(`
    *,
    facilities (*)
  `)
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);

      if (!selectedBookingId && data?.[0]?.id) {
        setSelectedBookingId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking timeline.");
    } finally {
      setLoading(false);
    }
  }

  function openPaymentPage() {
    if (!selectedBooking?.id) return;

    navigate(`/my-bookings?highlight=${selectedBooking.id}&pay=1`);
  }

  function openMyBookings() {
    if (!selectedBooking?.id) {
      navigate("/my-bookings");
      return;
    }

    navigate(`/my-bookings?highlight=${selectedBooking.id}`);
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Booking Timeline" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">Premium Booking Tracking</p>

                <h2 className="mt-2 text-3xl font-black">
                  Track your booking progress.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  View each step from reservation to payment verification and approval.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest">
                  Total Bookings
                </p>
                <h3 className="mt-1 text-2xl font-black">{bookings.length}</h3>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Loading booking timeline...</p>
            </section>
          ) : bookings.length === 0 ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  No bookings yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Once you create a booking, its progress will appear here.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/booking")}
                  className="mt-5 rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
                >
                  Book a Facility
                </button>
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    My Bookings
                  </h3>

                  <p className="text-sm text-slate-500">
                    Select a booking to view its timeline.
                  </p>
                </div>

                <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                  {bookings.map((booking) => {
                    const tone = getOverallStatusTone(booking);
                    const active =
                      String(selectedBooking?.id) === String(booking.id);

                    return (
                      <button
                        type="button"
                        key={booking.id}
                        onClick={() => setSelectedBookingId(booking.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-[#C97B6C] bg-[#FFF7F4] shadow-sm"
                            : "border-[#DED8D2] bg-white hover:bg-[#F5F3F1]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[#2B2B2B]">
                              {getFacilityName(booking)}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(booking.booking_date)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {formatTime(booking.start_time)} -{" "}
                              {formatTime(booking.end_time)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${tone.className}`}
                          >
                            {tone.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
                        Selected Booking
                      </p>

                      <h3 className="mt-1 text-3xl font-black text-[#2B2B2B]">
                        {getFacilityName(selectedBooking)}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(selectedBooking?.booking_date)} •{" "}
                        {formatTime(selectedBooking?.start_time)} -{" "}
                        {formatTime(selectedBooking?.end_time)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openMyBookings}
                        className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
                      >
                        View Details
                      </button>

                      {["unpaid", "rejected_payment"].includes(
                        normalizePaymentStatus(selectedBooking?.payment_status)
                      ) &&
                        normalizeStatus(selectedBooking?.status) !== "expired" && (
                          <button
                            type="button"
                            onClick={openPaymentPage}
                            className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                          >
                            Upload Payment
                          </button>
                        )}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DetailCard
                      label="Booking Status"
                      value={formatStatusLabel(selectedBooking?.status)}
                    />
                    <DetailCard
                      label="Payment Status"
                      value={formatStatusLabel(selectedBooking?.payment_status)}
                    />
                    <DetailCard
                      label="Total Amount"
                      value={money(selectedBooking?.total_amount)}
                    />
                    <DetailCard
                      label="Amount Paid"
                      value={money(selectedBooking?.amount_paid)}
                    />
                    <DetailCard
                      label="Receipt Number"
                      value={selectedBooking?.receipt_number || "-"}
                    />
                    <DetailCard
                      label="Created At"
                      value={formatDateTime(selectedBooking?.created_at)}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Booking Progress Timeline
                    </h3>

                    <p className="text-sm text-slate-500">
                      This timeline updates automatically when your booking status changes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {timelineSteps.map((step, index) => (
                      <TimelineStep
                        key={step.key}
                        step={step}
                        index={index}
                        isLast={index === timelineSteps.length - 1}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    What to do next
                  </h3>

                  <NextAction booking={selectedBooking} onPay={openPaymentPage} />
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function TimelineStep({ step, index, isLast }) {
  const Icon = step.icon;

  const stateClass = {
    done: {
      circle: "bg-green-600 text-white",
      line: "bg-green-500",
      card: "border-green-200 bg-green-50",
      text: "text-green-700",
    },
    pending: {
      circle: "bg-slate-200 text-slate-500",
      line: "bg-slate-200",
      card: "border-[#DED8D2] bg-white",
      text: "text-slate-500",
    },
    failed: {
      circle: "bg-red-600 text-white",
      line: "bg-red-500",
      card: "border-red-200 bg-red-50",
      text: "text-red-700",
    },
  }[step.state];

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${stateClass.circle}`}
        >
          <Icon size={22} />
        </div>

        {!isLast && <div className={`mt-2 h-14 w-1 rounded ${stateClass.line}`} />}
      </div>

      <div className={`flex-1 rounded-2xl border p-4 ${stateClass.card}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${stateClass.text}`}>
          Step {index + 1}
        </p>

        <h4 className="mt-1 text-lg font-black text-[#2B2B2B]">
          {step.label}
        </h4>

        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
      </div>
    </div>
  );
}

function NextAction({ booking, onPay }) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (status === "cancelled") {
    return (
      <p className="mt-2 text-sm text-slate-500">
        This booking has been cancelled. You may create a new booking anytime.
      </p>
    );
  }

  if (status === "expired" || paymentStatus === "expired") {
    return (
      <p className="mt-2 text-sm text-orange-700">
        This reservation expired. Please create a new booking if you still want to reserve a slot.
      </p>
    );
  }

  if (paymentStatus === "unpaid" || paymentStatus === "rejected_payment") {
    return (
      <div className="mt-3">
        <p className="text-sm text-slate-600">
          Upload your payment proof so staff can verify your booking.
        </p>

        <button
          type="button"
          onClick={onPay}
          className="mt-4 rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
        >
          Upload Payment Proof
        </button>
      </div>
    );
  }

  if (paymentStatus === "pending_verification") {
    return (
      <p className="mt-2 text-sm text-blue-700">
        Your payment proof is under review. Please wait for staff verification.
      </p>
    );
  }

  if (status === "approved" && paymentStatus === "paid") {
    return (
      <p className="mt-2 text-sm text-green-700">
        Your booking is approved. Please arrive on time and present your receipt if needed.
      </p>
    );
  }

  return (
    <p className="mt-2 text-sm text-slate-500">
      Please wait for the next booking update.
    </p>
  );
}