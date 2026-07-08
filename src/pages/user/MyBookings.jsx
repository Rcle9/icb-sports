// src/pages/user/MyBookings.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Clock,
  CreditCard,
  FileImage,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { getPaymentSettings } from "../../services/paymentSettingsService";

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
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

function normalizeCompletionStatus(status) {
  return String(status || "not_completed").toLowerCase();
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility";
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getBalanceAmount(booking) {
  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getBookingTotal(booking) - Number(booking?.amount_paid || 0), 0);
}

function getReservationMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function getProfileContact(profile) {
  return (
    profile?.contact_number ||
    profile?.phone ||
    profile?.mobile_number ||
    ""
  );
}

function canCancelBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return (
    ["reserved", "pending"].includes(status) &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

function canPayBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const minutesLeft = getReservationMinutesLeft(booking);

  if (status === "expired" || paymentStatus === "expired") return false;

  if (minutesLeft !== null && minutesLeft <= 0) return false;

  return (
    ["reserved", "pending"].includes(status) &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

function canViewReceipt(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return paymentStatus === "paid" || status === "approved" || booking?.receipt_number;
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function getPaymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "unpaid") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function getCompletionStatusClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function formatCompletionStatus(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "Completed";
  if (value === "no_show") return "No-show";
  if (value === "cancelled_late") return "Cancelled Late";

  return "Not Completed";
}

function getOverallStep(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const completionStatus = normalizeCompletionStatus(booking?.completion_status);

  if (status === "cancelled") return "Cancelled";
  if (status === "expired" || paymentStatus === "expired") return "Expired";
  if (paymentStatus === "rejected_payment") return "Payment Rejected";
  if (completionStatus !== "not_completed") return formatCompletionStatus(completionStatus);
  if (status === "approved" && paymentStatus === "paid") return "Approved and Paid";
  if (paymentStatus === "pending_verification") return "Payment Review";
  if (status === "reserved") return "Reserved";
  if (status === "pending") return "Pending";

  return formatStatusLabel(status);
}

export default function MyBookings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const highlightId = searchParams.get("highlight");
  const openPay = searchParams.get("pay");

  const [bookings, setBookings] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState(null);

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "GCash",
    payment_reference: "",
    amount_paid: "",
    payment_proof_file: null,
  });

  const [receiptModal, setReceiptModal] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState(null);

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tick, setTick] = useState(0);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const profileContactNumber = useMemo(() => {
    return String(getProfileContact(profile) || "").trim();
  }, [profile]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === "all") return true;

      if (filter === "active") {
        return ["reserved", "pending", "approved"].includes(
          normalizeStatus(booking.status)
        );
      }

      if (filter === "payment") {
        return ["unpaid", "pending_verification", "rejected_payment"].includes(
          normalizePaymentStatus(booking.payment_status)
        );
      }

      if (filter === "completed") {
        return normalizeCompletionStatus(booking.completion_status) !== "not_completed";
      }

      if (filter === "cancelled") {
        return ["cancelled", "expired", "rejected"].includes(
          normalizeStatus(booking.status)
        );
      }

      return true;
    });
  }, [bookings, filter, tick]);

  const summary = useMemo(() => {
    const active = bookings.filter((booking) =>
      ["reserved", "pending", "approved"].includes(normalizeStatus(booking.status))
    ).length;

    const paymentReview = bookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "pending_verification"
    ).length;

    const approved = bookings.filter(
      (booking) =>
        normalizeStatus(booking.status) === "approved" &&
        normalizePaymentStatus(booking.payment_status) === "paid"
    ).length;

    const completed = bookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    return {
      active,
      paymentReview,
      approved,
      completed,
    };
  }, [bookings, tick]);

  useEffect(() => {
    if (!user?.id) return;

    loadPageData();

    const channel = supabase
      .channel(`my-bookings-live-${user.id}-${Date.now()}`)
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
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!highlightId || bookings.length === 0) return;

    const selected = bookings.find(
      (booking) => String(booking.id) === String(highlightId)
    );

    if (selected && openPay === "1" && canPayBooking(selected)) {
      openPaymentModal(selected);
    }
  }, [highlightId, openPay, bookings.length]);

  async function loadPageData() {
    try {
      setLoading(true);
      setError("");

      await Promise.all([loadBookings(false), loadPaymentSettings()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load my bookings.");
    } finally {
      setLoading(false);
    }
  }

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
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPaymentSettings() {
    try {
      const settings = await getPaymentSettings();
      setPaymentSettings(settings || null);
    } catch (err) {
      console.error("Failed to load payment settings:", err);
      setPaymentSettings(null);
    }
  }

  function openPaymentModal(booking) {
    setPaymentBooking(booking);
    setPaymentForm({
      payment_method: "GCash",
      payment_reference: "",
      amount_paid: String(getBookingTotal(booking)),
      payment_proof_file: null,
    });
    setPaymentModal(true);
    setError("");
    setMessage("");
  }

  function closePaymentModal() {
    if (uploading) return;

    setPaymentModal(false);
    setPaymentBooking(null);
    setPaymentForm({
      payment_method: "GCash",
      payment_reference: "",
      amount_paid: "",
      payment_proof_file: null,
    });
  }

  function handlePaymentChange(event) {
    const { name, value, files } = event.target;

    if (name === "payment_proof_file") {
      setPaymentForm((prev) => ({
        ...prev,
        payment_proof_file: files?.[0] || null,
      }));
      return;
    }

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function uploadPaymentProofFile(file, bookingId) {
    if (!file) return null;

    const extension = file.name.split(".").pop();
    const fileName = `${user.id}/${bookingId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(fileName);

    return data?.publicUrl || null;
  }

  async function createStaffPaymentNotification(booking, proofUrl) {
    try {
      await supabase.from("notifications").insert({
        role: "staff",
        title: "Payment proof uploaded",
        message: `${profile?.full_name || "A customer"} uploaded payment proof for ${getFacilityName(
          booking
        )}.`,
        type: "payment_uploaded",
        is_read: false,
        reference_id: booking.id,
        reference_type: "booking",
        action_url: `/staff/manage-bookings?highlight=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          facility_name: getFacilityName(booking),
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference,
          amount_paid: Number(paymentForm.amount_paid || 0),
          proof_url: proofUrl,
        },
      });
    } catch (err) {
      console.error("Staff payment notification error:", err.message);
    }
  }

  async function createAdminPaymentNotification(booking, proofUrl) {
    try {
      await supabase.from("notifications").insert({
        role: "admin",
        title: "Payment proof uploaded",
        message: `${profile?.full_name || "A customer"} uploaded payment proof for ${getFacilityName(
          booking
        )}.`,
        type: "payment_uploaded",
        is_read: false,
        reference_id: booking.id,
        reference_type: "booking",
        action_url: `/admin/manage-bookings?highlight=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          facility_name: getFacilityName(booking),
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference,
          amount_paid: Number(paymentForm.amount_paid || 0),
          proof_url: proofUrl,
        },
      });
    } catch (err) {
      console.error("Admin payment notification error:", err.message);
    }
  }

  async function handleSubmitPayment() {
    try {
      if (!paymentBooking?.id) return;

      setUploading(true);
      setError("");
      setMessage("");

      if (!canPayBooking(paymentBooking)) {
        throw new Error("This reservation is no longer available for payment upload.");
      }

      if (!paymentForm.payment_method) {
        throw new Error("Please select a payment method.");
      }

      if (!paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0) {
        throw new Error("Please enter the amount paid.");
      }

      if (!paymentForm.payment_reference && paymentForm.payment_method !== "Cash") {
        throw new Error("Please enter the payment reference number.");
      }

      if (!paymentForm.payment_proof_file) {
        throw new Error("Please upload your payment proof.");
      }

      const proofUrl = await uploadPaymentProofFile(
        paymentForm.payment_proof_file,
        paymentBooking.id
      );

      const amountPaid = Number(paymentForm.amount_paid || 0);
      const totalAmount = getBookingTotal(paymentBooking);
      const balanceAmount = Math.max(totalAmount - amountPaid, 0);

      const updatePayload = {
        payment_status: "pending_verification",
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference || "",
        amount_paid: amountPaid,
        balance_amount: balanceAmount,
        payment_date: new Date().toISOString(),
        payment_submitted_at: new Date().toISOString(),
        payment_rejection_reason: null,
        payment_verification_result: null,
        payment_verification_notes: "",
      };

      if (proofUrl) {
        updatePayload.payment_proof_url = proofUrl;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", paymentBooking.id)
        .eq("user_id", user.id)
        .select("*, facilities (*)")
        .single();

      if (error) throw error;

      await createStaffPaymentNotification(data, proofUrl);
      await createAdminPaymentNotification(data, proofUrl);

      setMessage("Payment proof uploaded successfully. Please wait for staff verification.");
      closePaymentModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload payment proof.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelBooking(booking) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setProcessingId(booking.id);
      setError("");
      setMessage("");

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          facility_approval_status: "cancelled",
          cancellation_reason: "Cancelled by user.",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setMessage("Booking cancelled successfully.");
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setProcessingId("");
    }
  }

  function openReceiptModal(booking) {
    setReceiptBooking(booking);
    setReceiptModal(true);
  }

  function closeReceiptModal() {
    setReceiptBooking(null);
    setReceiptModal(false);
  }

  function openTimeline(booking) {
    navigate(`/booking-timeline?highlight=${booking.id}`);
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="My Bookings" subtitle="Track reservations and payments" />

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {message}
            </div>
          )}

          {!profileContactNumber && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <Phone size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black">Contact number missing</p>
                    <p className="mt-1 font-semibold">
                      Add your contact number in Profile Settings so staff can contact you about booking or payment concerns.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/user/profile")}
                  className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700"
                >
                  Update Profile
                </button>
              </div>
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">My Booking Center</p>

                <h2 className="mt-2 text-3xl font-black">
                  Manage your reservations and payments.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Upload payment proof, track approval, view receipts, and check your booking status.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Active" value={summary.active} />
                <HeroStat label="Payment Review" value={summary.paymentReview} />
                <HeroStat label="Approved" value={summary.approved} />
                <HeroStat label="Completed" value={summary.completed} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Booking Filters
                </h3>

                <p className="text-sm text-slate-500">
                  Filter your reservations by current progress.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                  All
                </FilterButton>
                <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
                  Active
                </FilterButton>
                <FilterButton active={filter === "payment"} onClick={() => setFilter("payment")}>
                  Payment
                </FilterButton>
                <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>
                  Completed
                </FilterButton>
                <FilterButton active={filter === "cancelled"} onClick={() => setFilter("cancelled")}>
                  Cancelled / Expired
                </FilterButton>

                <button
                  type="button"
                  onClick={() => loadBookings()}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    Refresh
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Booking List
                </h3>

                <p className="text-sm text-slate-500">
                  {filteredBookings.length} booking(s) shown.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/booking")}
                className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
              >
                Book New Facility
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading your bookings...</p>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  No bookings found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Your bookings will appear here once you reserve a facility.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/booking")}
                  className="mt-5 rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
                >
                  Book a Facility
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    highlighted={String(booking.id) === String(highlightId)}
                    processing={processingId === booking.id}
                    onPay={() => openPaymentModal(booking)}
                    onCancel={() => handleCancelBooking(booking)}
                    onReceipt={() => openReceiptModal(booking)}
                    onTimeline={() => openTimeline(booking)}
                  />
                ))}
              </div>
            )}
          </section>

          {paymentModal && paymentBooking && (
            <PaymentModal
              booking={paymentBooking}
              form={paymentForm}
              paymentSettings={paymentSettings}
              uploading={uploading}
              onChange={handlePaymentChange}
              onClose={closePaymentModal}
              onSubmit={handleSubmitPayment}
            />
          )}

          {receiptModal && receiptBooking && (
            <ReceiptModal booking={receiptBooking} onClose={closeReceiptModal} />
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({
  booking,
  highlighted,
  processing,
  onPay,
  onCancel,
  onReceipt,
  onTimeline,
}) {
  const minutesLeft = getReservationMinutesLeft(booking);
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);

  const showTimer =
    minutesLeft !== null &&
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus);

  return (
    <div
      className={`rounded-[28px] border bg-white p-5 shadow-sm ${
        highlighted ? "border-[#C97B6C] ring-4 ring-[#C97B6C]/10" : "border-[#DED8D2]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(status)}`}>
              {formatStatusLabel(status)}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getPaymentStatusClass(paymentStatus)}`}>
              {formatStatusLabel(paymentStatus)}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getCompletionStatusClass(completionStatus)}`}>
              {formatCompletionStatus(completionStatus)}
            </span>

            {booking.is_walk_in && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-700">
                Walk-in
              </span>
            )}
          </div>

          <h3 className="text-2xl font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          {showTimer && (
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${
                minutesLeft <= 5
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <Clock size={16} className="mr-2 inline" />
              Reservation timer: {minutesLeft} minute(s) left
            </div>
          )}

          {paymentStatus === "pending_verification" && (
            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              <ShieldCheck size={16} className="mr-2 inline" />
              Your payment proof is waiting for staff verification.
            </div>
          )}

          {status === "approved" && paymentStatus === "paid" && (
            <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              <CheckCircle size={16} className="mr-2 inline" />
              Your booking is approved and paid.
            </div>
          )}

          {booking.payment_rejection_reason && paymentStatus === "rejected_payment" && (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <b>Payment Rejection Reason:</b> {booking.payment_rejection_reason}
            </div>
          )}

          {booking.completion_notes && completionStatus !== "not_completed" && (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <b>Completion Notes:</b> {booking.completion_notes}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniDetail label="Progress" value={getOverallStep(booking)} />
            <MiniDetail label="Hours" value={`${booking.total_hours || 0} hour(s)`} />
            <MiniDetail label="Total" value={money(getBookingTotal(booking))} />
            <MiniDetail label="Paid" value={money(booking.amount_paid || 0)} />
            <MiniDetail label="Balance" value={money(getBalanceAmount(booking))} />
            <MiniDetail label="Payment Method" value={booking.payment_method || "-"} />
            <MiniDetail label="Reference" value={booking.payment_reference || "-"} />
            <MiniDetail label="Receipt" value={booking.receipt_number || "-"} />
            <MiniDetail label="Contact" value={booking.contact_number || "-"} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:w-[230px] xl:flex-col">
          <button
            type="button"
            onClick={onTimeline}
            className="rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarClock size={16} />
              Timeline
            </span>
          </button>

          {canPayBooking(booking) && (
            <button
              type="button"
              onClick={onPay}
              className="rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
            >
              <span className="inline-flex items-center gap-2">
                <Upload size={16} />
                Upload Payment
              </span>
            </button>
          )}

          {canViewReceipt(booking) && (
            <button
              type="button"
              onClick={onReceipt}
              className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-100"
            >
              <span className="inline-flex items-center gap-2">
                <Receipt size={16} />
                Receipt
              </span>
            </button>
          )}

          {canCancelBooking(booking) && (
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <XCircle size={16} />
                {processing ? "Cancelling..." : "Cancel"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  booking,
  form,
  paymentSettings,
  uploading,
  onChange,
  onClose,
  onSubmit,
}) {
  const minutesLeft = getReservationMinutesLeft(booking);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Payment Upload
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Upload payment proof
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Submit your payment proof for staff verification.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            <X size={20} />
          </button>
        </div>

        {minutesLeft !== null && (
          <div
            className={`mt-5 rounded-2xl px-4 py-4 text-sm font-bold ${
              minutesLeft <= 5 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            <Clock size={17} className="mr-2 inline" />
            Your reservation will expire in {minutesLeft} minute(s). Upload your payment proof before the timer ends.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <PaymentInstructionsBox settings={paymentSettings} />

          <div className="rounded-2xl border border-[#DED8D2] bg-white p-5">
            <h3 className="text-lg font-black text-[#2B2B2B]">
              Payment Form
            </h3>

            <div className="mt-4 space-y-4">
              <MiniDetail label="Facility" value={getFacilityName(booking)} />
              <MiniDetail
                label="Schedule"
                value={`${formatDate(booking.booking_date)} • ${formatTime(
                  booking.start_time
                )} - ${formatTime(booking.end_time)}`}
              />
              <MiniDetail label="Total Amount" value={money(getBookingTotal(booking))} />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Payment Method
                </label>

                <select
                  name="payment_method"
                  value={form.payment_method}
                  onChange={onChange}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Reference Number
                </label>

                <input
                  name="payment_reference"
                  value={form.payment_reference}
                  onChange={onChange}
                  placeholder="Enter payment reference number"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Amount Paid
                </label>

                <input
                  type="number"
                  name="amount_paid"
                  value={form.amount_paid}
                  onChange={onChange}
                  placeholder="Enter amount paid"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Payment Proof Screenshot
                </label>

                <input
                  type="file"
                  name="payment_proof_file"
                  accept="image/*,.pdf"
                  onChange={onChange}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-[#C97B6C] file:px-4 file:py-2 file:font-bold file:text-white"
                />

                {form.payment_proof_file && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Selected file: {form.payment_proof_file.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-yellow-50 px-4 py-4 text-sm text-yellow-800">
          Please make sure your uploaded proof clearly shows the payment amount,
          payment date, reference number, and receiver/account details.
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={uploading}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Submit Payment Proof"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentInstructionsBox({ settings }) {
  const gcashQr =
    settings?.gcash_qr_url ||
    settings?.gcash_qr ||
    settings?.qr_url ||
    settings?.payment_qr_url ||
    "";
  const bankQr =
    settings?.bank_qr_url ||
    settings?.bank_qr ||
    "";

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-5">
      <h3 className="text-lg font-black text-[#2B2B2B]">
        Payment Instructions
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        Pay using the available account details below, then upload your proof.
      </p>

      <div className="mt-5 space-y-4">
        <PaymentInfo
          label="GCash Name"
          value={settings?.gcash_name || settings?.gcash_account_name || "-"}
        />
        <PaymentInfo
          label="GCash Number"
          value={settings?.gcash_number || settings?.gcash_account_number || "-"}
        />
        <PaymentInfo
          label="Bank Name"
          value={settings?.bank_name || "-"}
        />
        <PaymentInfo
          label="Bank Account Name"
          value={settings?.bank_account_name || "-"}
        />
        <PaymentInfo
          label="Bank Account Number"
          value={settings?.bank_account_number || "-"}
        />
      </div>

      {(gcashQr || bankQr) && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {gcashQr && <QrBox label="GCash QR" url={gcashQr} />}
          {bankQr && <QrBox label="Bank QR" url={bankQr} />}
        </div>
      )}

      {settings?.payment_instructions && (
        <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600">
          {settings.payment_instructions}
        </div>
      )}
    </div>
  );
}

function QrBox({ label, url }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="mb-3 text-sm font-black text-[#2B2B2B]">{label}</p>

      <img
        src={url}
        alt={label}
        className="mx-auto h-48 w-48 rounded-2xl object-contain"
      />
    </div>
  );
}

function ReceiptModal({ booking, onClose }) {
  const printRef = useRef(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;

    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");

    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #222;
            }
            .receipt {
              max-width: 720px;
              margin: 0 auto;
              border: 1px solid #ddd;
              border-radius: 18px;
              padding: 28px;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #ddd;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 1px solid #eee;
              padding: 10px 0;
              font-size: 14px;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
            .value {
              text-align: right;
              font-weight: bold;
            }
            .total {
              font-size: 20px;
              color: #c97b6c;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Official Receipt
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Booking Receipt
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1]"
          >
            Close
          </button>
        </div>

        <div ref={printRef} className="mt-6">
          <div className="receipt rounded-[24px] border border-[#DED8D2] bg-white p-6">
            <div className="header text-center">
              <h1 className="text-2xl font-black text-[#2B2B2B]">
                InCredoBall Sports Center
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Booking Payment Receipt
              </p>
            </div>

            <ReceiptRow label="Receipt Number" value={booking.receipt_number || "-"} />
            <ReceiptRow label="Facility" value={getFacilityName(booking)} />
            <ReceiptRow label="Booking Date" value={formatDate(booking.booking_date)} />
            <ReceiptRow
              label="Time"
              value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
            />
            <ReceiptRow label="Contact Number" value={booking.contact_number || "-"} />
            <ReceiptRow label="Total Hours" value={`${booking.total_hours || 0} hour(s)`} />
            <ReceiptRow label="Rate Per Hour" value={money(booking.rate_per_hour)} />
            <ReceiptRow label="Payment Method" value={booking.payment_method || "-"} />
            <ReceiptRow label="Payment Reference" value={booking.payment_reference || "-"} />
            <ReceiptRow label="Payment Status" value={formatStatusLabel(booking.payment_status)} />
            <ReceiptRow label="Booking Status" value={formatStatusLabel(booking.status)} />
            <ReceiptRow label="Completion Status" value={formatCompletionStatus(booking.completion_status)} />
            <ReceiptRow label="Issued At" value={formatDateTime(booking.receipt_issued_at || booking.payment_verified_at)} />
            <ReceiptRow label="Total Amount" value={money(getBookingTotal(booking))} total />
            <ReceiptRow label="Amount Paid" value={money(booking.amount_paid)} total />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463]"
          >
            <span className="inline-flex items-center gap-2">
              <Printer size={18} />
              Print Receipt
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, total = false }) {
  return (
    <div className="row flex items-center justify-between gap-4 border-b border-[#EEE] py-3">
      <span className="label text-sm font-bold text-slate-500">{label}</span>
      <span
        className={`value text-right font-black ${
          total ? "total text-xl text-[#C97B6C]" : "text-[#2B2B2B]"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function PaymentInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F5F3F1] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-[#C97B6C] text-white"
          : "border border-[#DED8D2] text-slate-600 hover:bg-[#F5F3F1]"
      }`}
    >
      {children}
    </button>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}