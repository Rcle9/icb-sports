// src/pages/staff/ManageBookings.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

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
      year: "numeric",
      month: "short",
      day: "2-digit",
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

function normalizeStatus(status) {
  return String(status || "reserved").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function normalizeCompletionStatus(status) {
  return String(status || "not_completed").toLowerCase();
}

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || booking?.facility_name || "Facility";
}

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking?.walk_in_customer_name || booking?.customer_name || "Walk-in Customer";
  }

  return booking?.customer_name || booking?.profiles?.full_name || "User";
}

function getCustomerContact(booking) {
  return (
    booking?.walk_in_contact_number ||
    booking?.contact_number ||
    booking?.profiles?.contact_number ||
    booking?.profiles?.email ||
    "-"
  );
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getPaidAmount(booking) {
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (paymentStatus === "paid") {
    return Number(booking?.amount_paid || getBookingTotal(booking) || 0);
  }

  return Number(booking?.amount_paid || 0);
}

function getBalanceAmount(booking) {
  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getBookingTotal(booking) - getPaidAmount(booking), 0);
}

function generateReceiptNumber() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);

  return `ICB-${stamp}-${random}`;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function paymentClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "unpaid") return "bg-amber-100 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

function completionClass(status) {
  const value = normalizeCompletionStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "no_show") return "bg-orange-100 text-orange-700";
  if (value === "cancelled_late") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function defaultChecklist() {
  return {
    amount_matches: false,
    proof_readable: false,
    reference_visible: false,
    receiver_confirmed: false,
  };
}

export default function ManageBookings() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();

  const highlightedId = searchParams.get("highlight");
  const selectedRef = useRef(null);

  const currentRole = profile?.role === "admin" ? "admin" : "staff";

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [verificationChecklist, setVerificationChecklist] = useState(defaultChecklist());
  const [verificationNotes, setVerificationNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const checklistComplete = useMemo(() => {
    return (
      verificationChecklist.amount_matches &&
      verificationChecklist.proof_readable &&
      verificationChecklist.reference_visible &&
      verificationChecklist.receiver_confirmed
    );
  }, [verificationChecklist]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);
      const completionStatus = normalizeCompletionStatus(booking.completion_status);
      const source = booking.is_walk_in ? "walk_in" : "online";

      const searchText = [
        booking.id,
        getCustomerName(booking),
        getCustomerContact(booking),
        getFacilityName(booking),
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.status,
        booking.payment_status,
        booking.payment_reference,
        booking.receipt_number,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.trim().toLowerCase());

      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesPayment = paymentFilter === "all" || paymentStatus === paymentFilter;
      const matchesSource = sourceFilter === "all" || source === sourceFilter;
      const matchesCompletion =
        completionFilter === "all" || completionStatus === completionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesSource &&
        matchesCompletion
      );
    });
  }, [bookings, search, statusFilter, paymentFilter, sourceFilter, completionFilter]);

  const summary = useMemo(() => {
    return {
      total: bookings.length,
      reserved: bookings.filter((item) => normalizeStatus(item.status) === "reserved")
        .length,
      pending: bookings.filter((item) => normalizeStatus(item.status) === "pending")
        .length,
      approved: bookings.filter((item) => normalizeStatus(item.status) === "approved")
        .length,
      pendingPayment: bookings.filter(
        (item) => normalizePaymentStatus(item.payment_status) === "pending_verification"
      ).length,
      paid: bookings.filter((item) => normalizePaymentStatus(item.payment_status) === "paid")
        .length,
      completed: bookings.filter(
        (item) => normalizeCompletionStatus(item.completion_status) === "completed"
      ).length,
      revenue: bookings.reduce((sum, item) => sum + getPaidAmount(item), 0),
    };
  }, [bookings]);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`manage-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadBookings(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!highlightedId || bookings.length === 0) return;

    const highlighted = bookings.find((item) => String(item.id) === String(highlightedId));

    if (highlighted) {
      openDetailsModal(highlighted);

      setTimeout(() => {
        selectedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);
    }
  }, [highlightedId, bookings]);

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (*),
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);

      if (selectedBooking?.id) {
        const freshSelected = (data || []).find(
          (item) => String(item.id) === String(selectedBooking.id)
        );

        if (freshSelected) setSelectedBooking(freshSelected);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
      setProcessing("");
    }
  }

  function openDetailsModal(booking) {
    setSelectedBooking(booking);
    setVerificationChecklist(
      booking?.payment_verification_checklist &&
        typeof booking.payment_verification_checklist === "object"
        ? {
            ...defaultChecklist(),
            ...booking.payment_verification_checklist,
          }
        : defaultChecklist()
    );
    setVerificationNotes(booking?.payment_verification_notes || "");
    setDetailsModalOpen(true);
  }

  function closeDetailsModal() {
    if (processing) return;

    setDetailsModalOpen(false);
    setSelectedBooking(null);
    setVerificationChecklist(defaultChecklist());
    setVerificationNotes("");
  }

  function toggleChecklistItem(key) {
    setVerificationChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function createNotification({ booking, title, message, type, actionUrl }) {
    if (!booking?.user_id) return;

    try {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        role: "user",
        title,
        message,
        type,
        is_read: false,
        reference_id: booking.id,
        reference_type: "booking",
        action_url: actionUrl || `/my-bookings?highlight=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          facility_name: getFacilityName(booking),
          booking_date: booking.booking_date,
          start_time: cleanTime(booking.start_time),
          end_time: cleanTime(booking.end_time),
          amount_paid: getPaidAmount(booking),
          total_amount: getBookingTotal(booking),
          receipt_number: booking.receipt_number || "",
          contact_number: getCustomerContact(booking),
        },
      });
    } catch (err) {
      console.error("Notification error:", err.message);
    }
  }

  async function createActivityLog(action, description, booking) {
    try {
      await supabase.from("activity_logs").insert({
        user_id: user?.id || null,
        role: currentRole,
        action,
        description,
        entity_type: "booking",
        entity_id: booking?.id || null,
        metadata: {
          booking_id: booking?.id,
          customer: getCustomerName(booking),
          facility: getFacilityName(booking),
          contact_number: getCustomerContact(booking),
        },
      });
    } catch (err) {
      console.error("Activity log error:", err.message);
    }
  }

  async function handleVerifyPayment(booking) {
    if (!checklistComplete) {
      setError("Please complete the payment verification checklist first.");
      return;
    }

    const confirmed = window.confirm(
      "Verify this payment and approve the booking?"
    );

    if (!confirmed) return;

    try {
      setProcessing(booking.id);
      setError("");
      setMessage("");

      const totalAmount = getBookingTotal(booking);
      const amountPaid = Number(booking.amount_paid || totalAmount || 0);
      const receiptNumber = booking.receipt_number || generateReceiptNumber();

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "approved",
          facility_approval_status: "approved",
          payment_status: "paid",
          amount_paid: amountPaid,
          balance_amount: Math.max(totalAmount - amountPaid, 0),
          payment_verified_by: user?.id || null,
          payment_verified_at: new Date().toISOString(),
          payment_verification_result: "verified",
          payment_verification_checklist: verificationChecklist,
          payment_verification_notes: verificationNotes,
          receipt_number: receiptNumber,
          receipt_issued_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .select(`
          *,
          facilities (*),
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .single();

      if (error) throw error;

      await createNotification({
        booking: data,
        title: "Payment verified",
        message: `Your payment for ${getFacilityName(data)} has been verified. Your booking is now approved.`,
        type: "payment_verified",
        actionUrl: `/my-bookings?highlight=${data.id}`,
      });

      await createActivityLog(
        "payment_verified",
        `Verified payment for ${getCustomerName(data)}.`,
        data
      );

      setMessage("Payment verified and booking approved.");
      setSelectedBooking(data);
      setDetailsModalOpen(false);
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to verify payment.");
    } finally {
      setProcessing("");
    }
  }

  async function handleRejectPayment(booking) {
    const reason = window.prompt("Enter reason for rejecting payment proof:");

    if (!reason) return;

    try {
      setProcessing(booking.id);
      setError("");
      setMessage("");

      const { data, error } = await supabase
        .from("bookings")
        .update({
          payment_status: "rejected_payment",
          payment_rejection_reason: reason,
          payment_rejected_at: new Date().toISOString(),
          payment_verification_result: "rejected",
          payment_verification_checklist: verificationChecklist,
          payment_verification_notes: verificationNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .select(`
          *,
          facilities (*),
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .single();

      if (error) throw error;

      await createNotification({
        booking: data,
        title: "Payment proof rejected",
        message: `Your payment proof for ${getFacilityName(data)} was rejected. Reason: ${reason}`,
        type: "payment_rejected",
        actionUrl: `/my-bookings?highlight=${data.id}&pay=1`,
      });

      await createActivityLog(
        "payment_rejected",
        `Rejected payment proof for ${getCustomerName(data)}.`,
        data
      );

      setMessage("Payment proof rejected.");
      setSelectedBooking(data);
      setDetailsModalOpen(false);
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reject payment.");
    } finally {
      setProcessing("");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setSourceFilter("all");
    setCompletionFilter("all");
  }

  return (
    <div className="page-shell">
      <Sidebar role={currentRole} />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Manage Bookings"
            subtitle={
              currentRole === "admin"
                ? "Admin booking and payment management"
                : "Staff booking and payment management"
            }
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}
          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Booking Control Center
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Review reservations and verify payments.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  Open booking details in a modal, review payment proof, complete
                  the verification checklist, and approve or reject payment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Total" value={summary.total} />
                <HeroStat label="Payment Review" value={summary.pendingPayment} />
                <HeroStat label="Approved" value={summary.approved} />
                <HeroStat label="Revenue" value={money(summary.revenue)} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Reserved"
              value={summary.reserved}
              description="Waiting for payment proof"
              icon={<AlertCircle size={21} />}
              tone="blue"
            />

            <MetricCard
              title="Pending"
              value={summary.pending}
              description="Waiting for staff action"
              icon={<AlertCircle size={21} />}
              tone="amber"
            />

            <MetricCard
              title="Payment Review"
              value={summary.pendingPayment}
              description="Uploaded proofs to verify"
              icon={<CreditCard size={21} />}
              tone="orange"
            />

            <MetricCard
              title="Paid"
              value={summary.paid}
              description="Verified payment records"
              icon={<CheckCircle2 size={21} />}
              tone="green"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="icb-eyebrow">Filters</p>
                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Find booking records
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Search by customer, facility, date, status, payment reference,
                  or receipt number.
                </p>
              </div>

              <button type="button" onClick={() => loadBookings()} className="icb-btn-light">
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="icb-label flex items-center gap-2">
                  <Search size={16} />
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search booking..."
                  className="icb-input"
                />
              </div>

              <FilterSelect
                label="Booking Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  ["all", "All"],
                  ["reserved", "Reserved"],
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                  ["rejected", "Rejected"],
                  ["cancelled", "Cancelled"],
                  ["expired", "Expired"],
                  ["completed", "Completed"],
                ]}
              />

              <FilterSelect
                label="Payment"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  ["all", "All"],
                  ["unpaid", "Unpaid"],
                  ["pending_verification", "Pending Verification"],
                  ["paid", "Paid"],
                  ["rejected_payment", "Rejected Payment"],
                  ["expired", "Expired"],
                ]}
              />

              <FilterSelect
                label="Source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[
                  ["all", "All"],
                  ["online", "Online"],
                  ["walk_in", "Walk-in"],
                ]}
              />

              <FilterSelect
                label="Completion"
                value={completionFilter}
                onChange={setCompletionFilter}
                options={[
                  ["all", "All"],
                  ["not_completed", "Not Completed"],
                  ["completed", "Completed"],
                  ["no_show", "No-show"],
                  ["cancelled_late", "Cancelled Late"],
                ]}
              />

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="icb-btn-light w-full">
                  Reset
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="icb-card p-8 text-sm font-semibold text-slate-500">
              Loading bookings...
            </section>
          ) : (
            <section className="icb-card p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="icb-eyebrow">Bookings</p>
                  <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                    Booking list
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {filteredBookings.length} of {bookings.length} booking(s)
                    shown.
                  </p>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center text-sm font-semibold text-slate-500">
                  No bookings found.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const highlighted =
                      highlightedId && String(highlightedId) === String(booking.id);
                    const selected =
                      selectedBooking &&
                      String(selectedBooking.id) === String(booking.id);

                    return (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        highlighted={highlighted}
                        selected={selected}
                        cardRef={highlighted ? selectedRef : null}
                        processing={processing === booking.id}
                        onSelect={() => openDetailsModal(booking)}
                        onVerify={() => openDetailsModal(booking)}
                        onRejectPayment={() => handleRejectPayment(booking)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {detailsModalOpen && selectedBooking && (
            <BookingDetailsModal
              booking={selectedBooking}
              processing={processing === selectedBooking.id}
              checklist={verificationChecklist}
              checklistComplete={checklistComplete}
              verificationNotes={verificationNotes}
              onChecklistChange={toggleChecklistItem}
              onVerificationNotesChange={setVerificationNotes}
              onClose={closeDetailsModal}
              onVerify={() => handleVerifyPayment(selectedBooking)}
              onRejectPayment={() => handleRejectPayment(selectedBooking)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({
  booking,
  highlighted,
  selected,
  cardRef,
  processing,
  onSelect,
  onVerify,
  onRejectPayment,
}) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);

  return (
    <div
      ref={cardRef}
      className={`rounded-[24px] border p-5 transition ${
        selected
          ? "border-[#C97B6C] bg-[#FFF8F6] ring-4 ring-[#C97B6C]/15"
          : highlighted
          ? "border-[#C97B6C] bg-[#FFF8F6]"
          : "border-[#DED8D2] bg-white hover:border-[#C97B6C]/40"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap gap-2">
            {highlighted && <Badge className="bg-[#C97B6C] text-white">Highlighted</Badge>}
            <Badge className={statusClass(status)}>{formatLabel(status)}</Badge>
            <Badge className={paymentClass(paymentStatus)}>
              {formatLabel(paymentStatus)}
            </Badge>
            {booking.is_walk_in && (
              <Badge className="bg-purple-100 text-purple-700">Walk-in</Badge>
            )}
          </div>

          <h4 className="mt-3 text-lg font-black text-[#0B1F33]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            {getCustomerName(booking)} • {getCustomerContact(booking)}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>
        </button>

        <div className="flex flex-col gap-2 lg:w-[170px]">
          <p className="text-left text-xl font-black text-[#C97B6C] lg:text-right">
            {money(getBookingTotal(booking))}
          </p>

          <button type="button" onClick={onSelect} className="icb-btn-light">
            <Eye size={16} />
            Details
          </button>

          {paymentStatus === "pending_verification" && (
            <>
              <button
                type="button"
                onClick={onVerify}
                disabled={processing}
                className="icb-btn-accent disabled:opacity-60"
              >
                Verify
              </button>

              <button
                type="button"
                onClick={onRejectPayment}
                disabled={processing}
                className="icb-btn-danger disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingDetailsModal({
  booking,
  processing,
  checklist,
  checklistComplete,
  verificationNotes,
  onChecklistChange,
  onVerificationNotesChange,
  onClose,
  onVerify,
  onRejectPayment,
}) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);
  const proofUrl = booking.payment_proof_url;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0B1F33]/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#DED8D2] pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="icb-eyebrow">Booking Details</p>

            <h2 className="mt-2 text-3xl font-black text-[#0B1F33]">
              {getFacilityName(booking)}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {getCustomerName(booking)} • {getCustomerContact(booking)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className={statusClass(status)}>{formatLabel(status)}</Badge>
              <Badge className={paymentClass(paymentStatus)}>
                Payment: {formatLabel(paymentStatus)}
              </Badge>
              <Badge className={completionClass(completionStatus)}>
                {formatLabel(completionStatus)}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#F3E4DF] hover:text-[#B86658] disabled:opacity-60"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-[#DED8D2] bg-[#FBFAF9] p-5">
              <p className="text-sm font-black text-[#0B1F33]">
                Booking Information
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Detail label="Booking Date" value={formatDate(booking.booking_date)} />
                <Detail
                  label="Time"
                  value={`${formatTime(booking.start_time)} - ${formatTime(
                    booking.end_time
                  )}`}
                />
                <Detail label="Customer Contact" value={getCustomerContact(booking)} />
                <Detail label="Source" value={booking.is_walk_in ? "Walk-in" : "Online"} />
                <Detail label="Total Amount" value={money(getBookingTotal(booking))} />
                <Detail label="Amount Paid" value={money(getPaidAmount(booking))} />
                <Detail label="Balance" value={money(getBalanceAmount(booking))} />
                <Detail label="Payment Method" value={booking.payment_method || "-"} />
                <Detail label="Payment Reference" value={booking.payment_reference || "-"} />
                <Detail label="Receipt Number" value={booking.receipt_number || "-"} />
                <Detail label="Created" value={formatDateTime(booking.created_at)} />
                <Detail
                  label="Payment Submitted"
                  value={formatDateTime(booking.payment_submitted_at)}
                />
              </div>
            </section>

            {proofUrl && (
              <section className="rounded-[24px] border border-[#DED8D2] bg-white p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#0B1F33]">
                      Payment Proof
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Review the proof before verifying the payment.
                    </p>
                  </div>

                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="icb-btn-light"
                  >
                    Open Full Image
                  </a>
                </div>

                {String(proofUrl).match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                  <a href={proofUrl} target="_blank" rel="noreferrer">
                    <img
                      src={proofUrl}
                      alt="Payment Proof"
                      className="mt-4 max-h-[520px] w-full rounded-2xl border border-[#DED8D2] object-contain"
                    />
                  </a>
                ) : (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="icb-btn-light mt-4"
                  >
                    View Payment Proof
                  </a>
                )}
              </section>
            )}

            {booking.notes && (
              <section className="rounded-[24px] border border-[#DED8D2] bg-[#FBFAF9] p-5">
                <p className="text-sm font-black text-[#0B1F33]">Booking Notes</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  {booking.notes}
                </p>
              </section>
            )}

            {booking.payment_rejection_reason && (
              <section className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-black text-red-700">
                  Payment Rejection Reason
                </p>
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {booking.payment_rejection_reason}
                </p>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {paymentStatus === "pending_verification" && (
              <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <ShieldCheck size={21} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-blue-900">
                      Payment Verification Checklist
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
                      Staff must check these items before verifying payment.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <ChecklistItem
                    checked={checklist.amount_matches}
                    label="Amount matches the total booking amount"
                    description={`Expected total: ${money(getBookingTotal(booking))}`}
                    onChange={() => onChecklistChange("amount_matches")}
                  />

                  <ChecklistItem
                    checked={checklist.proof_readable}
                    label="Payment proof is clear and readable"
                    description="Screenshot or receipt must not be blurry."
                    onChange={() => onChecklistChange("proof_readable")}
                  />

                  <ChecklistItem
                    checked={checklist.reference_visible}
                    label="Payment reference number is visible"
                    description="Reference must match or support the submitted reference."
                    onChange={() => onChecklistChange("reference_visible")}
                  />

                  <ChecklistItem
                    checked={checklist.receiver_confirmed}
                    label="Receiver/account details are correct"
                    description="Payment must be sent to the official InCredoBall account."
                    onChange={() => onChecklistChange("receiver_confirmed")}
                  />
                </div>

                <div className="mt-5">
                  <label className="text-xs font-black uppercase tracking-widest text-blue-700">
                    Verification Notes
                  </label>

                  <textarea
                    value={verificationNotes}
                    onChange={(event) =>
                      onVerificationNotesChange(event.target.value)
                    }
                    placeholder="Example: Amount and reference number verified."
                    className="mt-2 min-h-[100px] w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500"
                  />
                </div>

                {!checklistComplete && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    Complete all checklist items before verifying payment.
                  </div>
                )}
              </section>
            )}

            <section className="rounded-[24px] border border-[#DED8D2] bg-white p-5">
              <p className="text-sm font-black text-[#0B1F33]">Actions</p>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Verify the payment proof if it is valid, or reject it if the proof is incorrect.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {paymentStatus === "pending_verification" ? (
                  <>
                    <button
                      type="button"
                      onClick={onVerify}
                      disabled={processing || !checklistComplete}
                      className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CreditCard size={18} />
                      Verify Payment and Approve
                    </button>

                    <button
                      type="button"
                      onClick={onRejectPayment}
                      disabled={processing}
                      className="icb-btn-danger disabled:opacity-60"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl bg-[#F5F3F1] px-4 py-4 text-sm font-bold text-slate-600">
                    No payment verification action is needed for this booking.
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  disabled={processing}
                  className="icb-btn-light disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label, description, onChange }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
        checked
          ? "border-green-200 bg-green-50"
          : "border-blue-100 bg-white hover:border-blue-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-green-600"
      />

      <div>
        <p
          className={`text-sm font-black ${
            checked ? "text-green-700" : "text-[#0B1F33]"
          }`}
        >
          {label}
        </p>

        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="icb-label flex items-center gap-2">
        <Filter size={16} />
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="icb-select"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-lg font-black sm:text-xl">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "slate" }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tones[tone] || tones.slate
          }`}
        >
          {icon}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
            tones[tone] || tones.slate
          }`}
        >
          {title}
        </span>
      </div>

      <h3 className="mt-5 break-words text-3xl font-black text-[#0B1F33]">
        {value}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#0B1F33]">
        {String(value || "-")}
      </p>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {children}
    </span>
  );
}