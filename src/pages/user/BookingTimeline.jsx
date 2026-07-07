import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileImage,
  Filter,
  ReceiptText,
  RefreshCw,
  Search,
  Timer,
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

function formatTime(time24) {
  if (!time24) return "-";

  const [h, m] = cleanTime(time24).split(":");
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
      month: "short",
      day: "2-digit",
      year: "numeric",
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

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Facility Booking";
}

function getFinalTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computedTotal;
}

function getBalance(booking) {
  const balance = Number(booking?.balance_amount || 0);

  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return balance;
  }

  return Math.max(getFinalTotal(booking) - Number(booking?.amount_paid || 0), 0);
}

function getReservedMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();
  const diff = expiresAt - Date.now();

  if (Number.isNaN(expiresAt)) return null;
  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "completed") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-blue-100 text-blue-700";
  if (value === "unpaid") return "bg-slate-100 text-slate-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";
  if (value === "refunded") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function getCurrentStage(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const completionStatus = normalizeCompletionStatus(booking?.completion_status);

  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  if (status === "rejected") return "Rejected";
  if (completionStatus !== "not_completed" && completionStatus !== "-") {
    return formatStatusLabel(completionStatus);
  }
  if (status === "approved" && paymentStatus === "paid") return "Approved and Paid";
  if (paymentStatus === "pending_verification") return "Payment Review";
  if (paymentStatus === "rejected_payment") return "Payment Rejected";
  if (status === "pending") return "Staff Review";
  if (status === "reserved") return "Reserved";

  return formatStatusLabel(status);
}

function getTimelineTone(step) {
  if (step.state === "done") {
    return {
      icon: "bg-green-100 text-green-700",
      border: "border-green-200",
      card: "bg-green-50/40",
    };
  }

  if (step.state === "active") {
    return {
      icon: "bg-[#F3E4DF] text-[#B86658]",
      border: "border-[#C97B6C]/40",
      card: "bg-[#FFF8F6]",
    };
  }

  if (step.state === "danger") {
    return {
      icon: "bg-red-100 text-red-700",
      border: "border-red-200",
      card: "bg-red-50/40",
    };
  }

  if (step.state === "warning") {
    return {
      icon: "bg-orange-100 text-orange-700",
      border: "border-orange-200",
      card: "bg-orange-50/40",
    };
  }

  return {
    icon: "bg-slate-100 text-slate-500",
    border: "border-[#DED8D2]",
    card: "bg-white",
  };
}

function buildTimeline(booking) {
  if (!booking) return [];

  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);
  const hasPaymentProof = Boolean(booking.payment_proof_url);

  const isRejected = status === "rejected";
  const isCancelled = status === "cancelled";
  const isExpired = status === "expired";
  const isApproved = status === "approved" || status === "completed";
  const isPaid = paymentStatus === "paid";
  const isPaymentReview = paymentStatus === "pending_verification";
  const isPaymentRejected = paymentStatus === "rejected_payment";
  const isCompleted =
    completionStatus !== "not_completed" &&
    completionStatus !== "" &&
    completionStatus !== "-";

  const steps = [
    {
      key: "created",
      title: "Booking Created",
      description:
        "Your facility reservation request was created in the system.",
      date: booking.created_at,
      state: "done",
      icon: CalendarCheck,
    },
    {
      key: "reserved",
      title: "Slot Reserved",
      description:
        "The selected facility slot was temporarily reserved while waiting for payment proof.",
      date: booking.created_at,
      state:
        ["reserved", "pending", "approved", "completed"].includes(status) ||
        isPaid ||
        isPaymentReview
          ? "done"
          : isExpired
          ? "warning"
          : "pending",
      icon: Timer,
    },
    {
      key: "payment_upload",
      title: "Payment Proof Upload",
      description: hasPaymentProof
        ? "Your payment proof has been uploaded."
        : "Upload a clear payment proof so staff can verify your reservation.",
      date:
        booking.payment_submitted_at ||
        booking.payment_uploaded_at ||
        booking.updated_at,
      state: hasPaymentProof
        ? "done"
        : isPaymentRejected
        ? "active"
        : isExpired
        ? "warning"
        : "pending",
      icon: FileImage,
    },
    {
      key: "payment_review",
      title: "Payment Verification",
      description: isPaid
        ? "Staff verified your payment proof."
        : isPaymentRejected
        ? "Staff rejected the payment proof. You may upload another valid proof if still allowed."
        : isPaymentReview
        ? "Staff is checking the uploaded payment proof."
        : "Waiting for payment proof verification.",
      date:
        booking.payment_verified_at ||
        booking.payment_rejected_at ||
        booking.updated_at,
      state: isPaid
        ? "done"
        : isPaymentRejected
        ? "danger"
        : isPaymentReview
        ? "active"
        : "pending",
      icon: CreditCard,
    },
    {
      key: "approval",
      title: "Booking Approval",
      description: isApproved
        ? "Your booking is approved and ready for the scheduled session."
        : isRejected
        ? "Your booking request was rejected."
        : isCancelled
        ? "This booking was cancelled."
        : isExpired
        ? "This reservation expired because payment was not completed on time."
        : "Waiting for final booking approval.",
      date:
        booking.approved_at ||
        booking.rejected_at ||
        booking.cancelled_at ||
        booking.expired_at ||
        booking.updated_at,
      state: isApproved
        ? "done"
        : isRejected || isCancelled
        ? "danger"
        : isExpired
        ? "warning"
        : status === "pending"
        ? "active"
        : "pending",
      icon:
        isRejected || isCancelled || isExpired
          ? AlertCircle
          : CheckCircle2,
    },
    {
      key: "completion",
      title: "Session Completion",
      description: isCompleted
        ? `Session marked as ${formatStatusLabel(completionStatus)}.`
        : "This step is completed after the scheduled facility session.",
      date: booking.completed_at || booking.completion_updated_at || null,
      state: isCompleted ? "done" : "pending",
      icon: Clock,
    },
  ];

  return steps;
}

export default function BookingTimeline() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const highlightedId =
    searchParams.get("highlight") ||
    searchParams.get("booking_id") ||
    searchParams.get("reference_id");

  const selectedRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const mappedBookings = useMemo(() => {
    return bookings
      .map((booking) => ({
        ...booking,
        display_title: getFacilityName(booking),
        display_total: getFinalTotal(booking),
      }))
      .sort((a, b) => {
        return (
          new Date(b.created_at || b.booking_date) -
          new Date(a.created_at || a.booking_date)
        );
      });
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return mappedBookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const matchesPayment =
        paymentFilter === "all" ||
        paymentStatus === normalizePaymentStatus(paymentFilter);

      const searchText = [
        booking.display_title,
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.status,
        booking.payment_status,
        booking.receipt_number,
        booking.payment_reference,
        booking.id,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.trim().toLowerCase());

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [mappedBookings, search, statusFilter, paymentFilter]);

  const selectedBooking = useMemo(() => {
    if (selectedBookingId) {
      const selected = mappedBookings.find(
        (booking) => String(booking.id) === String(selectedBookingId)
      );

      if (selected) return selected;
    }

    if (highlightedId) {
      const highlighted = mappedBookings.find((booking) =>
        bookingMatchesHighlight(booking, highlightedId)
      );

      if (highlighted) return highlighted;
    }

    return filteredBookings[0] || mappedBookings[0] || null;
  }, [mappedBookings, filteredBookings, selectedBookingId, highlightedId]);

  const timelineSteps = useMemo(() => {
    return buildTimeline(selectedBooking);
  }, [selectedBooking]);

  const stats = useMemo(() => {
    const active = mappedBookings.filter((booking) =>
      ["reserved", "pending", "approved"].includes(normalizeStatus(booking.status))
    ).length;

    const completed = mappedBookings.filter(
      (booking) =>
        normalizeStatus(booking.status) === "completed" ||
        normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const needsPayment = mappedBookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      return (
        status === "reserved" &&
        ["unpaid", "rejected_payment"].includes(paymentStatus)
      );
    }).length;

    const issues = mappedBookings.filter((booking) =>
      ["rejected", "cancelled", "expired"].includes(normalizeStatus(booking.status))
    ).length;

    return {
      total: mappedBookings.length,
      active,
      completed,
      needsPayment,
      issues,
    };
  }, [mappedBookings]);

  useEffect(() => {
    if (user?.id) loadBookings();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`booking-timeline-user-${user.id}-${Date.now()}`)
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
  }, [user?.id]);

  useEffect(() => {
    if (!highlightedId || mappedBookings.length === 0) return;

    const highlighted = mappedBookings.find((booking) =>
      bookingMatchesHighlight(booking, highlightedId)
    );

    if (!highlighted) return;

    setSelectedBookingId(highlighted.id);

    setTimeout(() => {
      selectedRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  }, [highlightedId, mappedBookings]);

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*, facilities (*)")
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load booking timeline.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadBookings(false);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  function bookingMatchesHighlight(booking, id = highlightedId) {
    if (!id || !booking) return false;

    const possibleIds = [
      booking.id,
      booking.booking_id,
      booking.reference_id,
      booking.linked_booking_id,
      booking.parent_booking_id,
    ]
      .filter(Boolean)
      .map((value) => String(value));

    return possibleIds.includes(String(id));
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Booking Timeline" subtitle="Track booking progress" />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Booking Progress Tracker
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Follow every step of your reservation.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85">
                  See when your booking was created, reserved, paid, verified,
                  approved, rejected, expired, cancelled, or completed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Total" value={stats.total} />
                <HeroStat label="Active" value={stats.active} />
                <HeroStat label="Need Payment" value={stats.needsPayment} />
                <HeroStat label="Issues" value={stats.issues} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="All Timelines"
              value={stats.total}
              icon={<ReceiptText size={20} />}
            />
            <MiniStat
              label="Active Bookings"
              value={stats.active}
              icon={<CalendarCheck size={20} />}
              tone="blue"
            />
            <MiniStat
              label="Completed"
              value={stats.completed}
              icon={<CheckCircle2 size={20} />}
              tone="green"
            />
            <MiniStat
              label="Needs Action"
              value={stats.needsPayment}
              icon={<CreditCard size={20} />}
              tone="amber"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Filters</p>
                <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                  Search booking timeline
                </h3>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="icb-btn-light"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className="icb-label flex items-center gap-2">
                  <Search size={16} />
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by facility, date, status, payment, receipt, or booking ID"
                  className="icb-input"
                />
              </div>

              <div>
                <label className="icb-label flex items-center gap-2">
                  <Filter size={16} />
                  Booking Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="icb-select"
                >
                  <option value="all">All</option>
                  <option value="reserved">Reserved</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="icb-label">Payment Status</label>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="icb-select"
                >
                  <option value="all">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="paid">Paid</option>
                  <option value="rejected_payment">Rejected Payment</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="icb-btn-light">
                  Reset
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="icb-card p-8 text-sm font-semibold text-slate-500">
              Loading booking timeline...
            </div>
          ) : mappedBookings.length === 0 ? (
            <section className="icb-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                <CalendarCheck size={26} />
              </div>

              <h3 className="mt-4 text-2xl font-black text-[#0B1F33]">
                No booking timeline yet
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-slate-500">
                Your timeline will appear after you reserve a facility.
              </p>

              <Link to="/booking" className="icb-btn-accent mt-5">
                Book Facility
              </Link>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_1fr]">
              <div className="icb-card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="icb-eyebrow">Bookings</p>
                    <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                      Select a booking
                    </h3>
                  </div>

                  <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#C97B6C]">
                    {filteredBookings.length}
                  </span>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-5 text-sm font-semibold text-slate-500">
                    No booking matches your filter.
                  </div>
                ) : (
                  <div className="panel-scroll max-h-[720px] space-y-3 pr-1">
                    {filteredBookings.map((booking) => {
                      const selected =
                        selectedBooking &&
                        String(selectedBooking.id) === String(booking.id);

                      const highlighted = bookingMatchesHighlight(booking);

                      return (
                        <BookingTimelineCard
                          key={booking.id}
                          booking={booking}
                          selected={selected}
                          highlighted={highlighted}
                          selectedRef={highlighted ? selectedRef : null}
                          onClick={() => setSelectedBookingId(booking.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {selectedBooking ? (
                  <>
                    <BookingSummary booking={selectedBooking} />

                    <section className="icb-card p-5 sm:p-6">
                      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="icb-eyebrow">Progress</p>

                          <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
                            Timeline Details
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Current stage:{" "}
                            <span className="text-[#C97B6C]">
                              {getCurrentStage(selectedBooking)}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/my-bookings?highlight=${selectedBooking.id}`}
                            className="icb-btn-light"
                          >
                            View Booking
                          </Link>

                          {isPaymentActionNeeded(selectedBooking) && (
                            <Link
                              to={`/my-bookings?highlight=${selectedBooking.id}&pay=1`}
                              className="icb-btn-accent"
                            >
                              Upload Payment
                            </Link>
                          )}
                        </div>
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
                    </section>
                  </>
                ) : (
                  <div className="icb-card p-8 text-sm font-semibold text-slate-500">
                    Select a booking to view timeline.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function isPaymentActionNeeded(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  );
}

function BookingTimelineCard({ booking, selected, highlighted, selectedRef, onClick }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const minutesLeft = getReservedMinutesLeft(booking);

  return (
    <button
      type="button"
      ref={selectedRef}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-[#C97B6C] bg-[#FFF8F6] shadow-sm ring-4 ring-[#C97B6C]/15"
          : highlighted
          ? "border-[#C97B6C] bg-[#FFF8F6]"
          : "border-[#DED8D2] bg-white hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9]"
      }`}
    >
      <div className="flex flex-wrap gap-2">
        {highlighted && (
          <Badge className="bg-[#C97B6C] text-white">Selected Notification</Badge>
        )}

        <Badge className={statusClass(status)}>{formatStatusLabel(status)}</Badge>
        <Badge className={paymentStatusClass(paymentStatus)}>
          {formatStatusLabel(paymentStatus)}
        </Badge>
      </div>

      <h4 className="mt-3 line-clamp-1 font-black text-[#0B1F33]">
        {getFacilityName(booking)}
      </h4>

      <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
        {formatDate(booking.booking_date)}
      </p>

      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-[#C97B6C]">
          {money(getFinalTotal(booking))}
        </p>

        {minutesLeft !== null &&
          status === "reserved" &&
          ["unpaid", "rejected_payment"].includes(paymentStatus) && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-700">
              {minutesLeft} min left
            </span>
          )}
      </div>
    </button>
  );
}

function BookingSummary({ booking }) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);

  return (
    <section className="icb-card overflow-hidden">
      <div className="bg-[#0B1F33] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
          Selected Booking
        </p>

        <h3 className="mt-2 text-2xl font-black">{getFacilityName(booking)}</h3>

        <p className="mt-2 text-sm font-semibold text-white/80">
          {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
          {formatTime(booking.end_time)}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={statusClass(status)}>{formatStatusLabel(status)}</Badge>
          <Badge className={paymentStatusClass(paymentStatus)}>
            Payment: {formatStatusLabel(paymentStatus)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Total Amount" value={money(getFinalTotal(booking))} />
        <SummaryItem label="Amount Paid" value={money(booking.amount_paid)} />
        <SummaryItem label="Balance" value={money(getBalance(booking))} />
        <SummaryItem label="Current Stage" value={getCurrentStage(booking)} />
        <SummaryItem label="Receipt No." value={booking.receipt_number || "-"} />
        <SummaryItem
          label="Payment Ref."
          value={booking.payment_reference || "-"}
        />
        <SummaryItem
          label="Completion"
          value={formatStatusLabel(completionStatus)}
        />
        <SummaryItem label="Booking ID" value={booking.id || "-"} />
      </div>

      {booking.payment_rejection_reason && (
        <div className="mx-5 mb-5 rounded-2xl bg-red-50 p-4">
          <p className="text-sm font-black text-red-700">
            Payment Rejection Reason
          </p>
          <p className="mt-1 text-sm font-semibold text-red-600">
            {booking.payment_rejection_reason}
          </p>
        </div>
      )}

      {booking.rejection_reason && (
        <div className="mx-5 mb-5 rounded-2xl bg-red-50 p-4">
          <p className="text-sm font-black text-red-700">Rejection Reason</p>
          <p className="mt-1 text-sm font-semibold text-red-600">
            {booking.rejection_reason}
          </p>
        </div>
      )}

      {booking.cancellation_reason && (
        <div className="mx-5 mb-5 rounded-2xl bg-slate-100 p-4">
          <p className="text-sm font-black text-slate-700">Cancellation Reason</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {booking.cancellation_reason}
          </p>
        </div>
      )}
    </section>
  );
}

function TimelineStep({ step, index, isLast }) {
  const Icon = step.icon;
  const tone = getTimelineTone(step);

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute left-[23px] top-12 h-[calc(100%-20px)] w-[2px] bg-[#DED8D2]" />
      )}

      <div
        className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
      >
        <Icon size={21} />
      </div>

      <div className={`flex-1 rounded-2xl border p-4 ${tone.border} ${tone.card}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Step {index + 1}
            </p>

            <h4 className="mt-1 text-lg font-black text-[#0B1F33]">
              {step.title}
            </h4>

            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              {step.description}
            </p>
          </div>

          <Badge
            className={
              step.state === "done"
                ? "bg-green-100 text-green-700"
                : step.state === "active"
                ? "bg-[#F3E4DF] text-[#B86658]"
                : step.state === "danger"
                ? "bg-red-100 text-red-700"
                : step.state === "warning"
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-100 text-slate-600"
            }
          >
            {formatStatusLabel(step.state)}
          </Badge>
        </div>

        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
          <Clock size={14} />
          {formatDateTime(step.date)}
        </p>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, icon, tone = "navy" }) {
  const tones = {
    navy: "bg-[#F3E4DF] text-[#B86658]",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#0B1F33]">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tones[tone] || tones.navy
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F5F3F1] p-4">
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