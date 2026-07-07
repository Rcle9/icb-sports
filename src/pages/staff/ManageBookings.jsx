// src/pages/staff/ManageBookings.jsx

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Eye,
  FileImage,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  expireBookingReservation,
  getAllBookings,
  rejectPayment,
  verifyPayment,
} from "../../services/bookingService";
import {
  canCompleteBooking,
  formatCompletionStatus,
  getCompletionStatusClass,
  updateBookingCompletionStatus,
} from "../../services/bookingCompletionService";

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

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToDateString(dateString, days) {
  if (!dateString) return getTodayDate();

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
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
  return booking?.facilities?.name || booking?.facility?.name || "Facility";
}

function getCustomerName(booking) {
  if (booking?.is_walk_in) {
    return booking.walk_in_customer_name || "Walk-in Customer";
  }

  return booking?.profiles?.full_name || booking?.user?.full_name || "User";
}

function getCustomerContact(booking) {
  return (
    booking?.walk_in_contact_number ||
    booking?.contact_number ||
    booking?.profiles?.phone ||
    booking?.profiles?.contact_number ||
    "-"
  );
}

function getCustomerEmail(booking) {
  return booking?.profiles?.email || booking?.user?.email || "-";
}

function getBookingTotal(booking) {
  const totalHours = Number(booking?.total_hours || 0);
  const ratePerHour = Number(booking?.rate_per_hour || 0);
  const computed = totalHours * ratePerHour;

  return Number(booking?.total_amount || 0) || computed;
}

function getBalance(booking) {
  if (booking?.balance_amount !== null && booking?.balance_amount !== undefined) {
    return Number(booking.balance_amount || 0);
  }

  return Math.max(getBookingTotal(booking) - Number(booking?.amount_paid || 0), 0);
}

function getFacilityRate(facility) {
  return Number(
    facility?.rate_per_hour ||
      facility?.price_per_hour ||
      facility?.hourly_rate ||
      facility?.price ||
      0
  );
}

function normalizeFacilityType(value) {
  const type = String(value || "").toLowerCase().trim();

  if (type.includes("pickle")) return "pickleball";
  if (type.includes("basket")) return "basketball";
  if (type.includes("table") || type.includes("tennis")) return "table_tennis";

  return type.replaceAll(" ", "_");
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
}

function generateSlots() {
  return Array.from({ length: 17 }, (_, index) => {
    const startHour = 6 + index;
    const endHour = startHour + 1;

    const start = `${String(startHour).padStart(2, "0")}:00`;
    const end = `${String(endHour).padStart(2, "0")}:00`;

    return {
      index,
      start_time: start,
      end_time: end,
      label: `${formatTime(start)} - ${formatTime(end)}`,
    };
  });
}

function getReservationMinutesLeft(booking) {
  if (!booking?.reservation_expires_at) return null;

  const expiresAt = new Date(booking.reservation_expires_at).getTime();

  if (Number.isNaN(expiresAt)) return null;

  const diff = expiresAt - Date.now();

  if (diff <= 0) return 0;

  return Math.ceil(diff / 60000);
}

function isExpiredReservedBooking(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);
  const minutesLeft = getReservationMinutesLeft(booking);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus) &&
    minutesLeft !== null &&
    minutesLeft <= 0
  );
}

function isCalendarBlockingBooking(booking) {
  const status = normalizeStatus(booking?.status);

  if (!["reserved", "pending", "approved"].includes(status)) return false;

  if (isExpiredReservedBooking(booking)) return false;

  return true;
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
  if (value === "refunded") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function getCalendarClass(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (status === "approved" && paymentStatus === "paid") {
    return "border-green-600 bg-green-100 text-green-800";
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "border-blue-500 bg-blue-100 text-blue-800";
  }

  if (status === "reserved") {
    return "border-yellow-500 bg-yellow-100 text-yellow-800";
  }

  if (status === "pending") {
    return "border-yellow-500 bg-yellow-100 text-yellow-800";
  }

  return "border-slate-400 bg-slate-100 text-slate-700";
}

function canVerifyPayment(booking) {
  return normalizePaymentStatus(booking?.payment_status) === "pending_verification";
}

function canRejectPayment(booking) {
  return normalizePaymentStatus(booking?.payment_status) === "pending_verification";
}

function canMarkExpired(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  return (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus) &&
    isExpiredReservedBooking(booking)
  );
}

function getPaymentProofType(url = "") {
  const value = String(url || "").toLowerCase();

  if (value.includes(".pdf")) return "pdf";

  return "image";
}

const SPORT_FILTERS = [
  { value: "all", label: "All" },
  { value: "pickleball", label: "Pickleball" },
  { value: "basketball", label: "Basketball" },
  { value: "table_tennis", label: "Table Tennis" },
];

const DEFAULT_VERIFY_CHECKLIST = {
  amount_matches: false,
  proof_readable: false,
  reference_visible: false,
  receiver_confirmed: false,
};

export default function ManageBookings() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [viewMode, setViewMode] = useState("list");
  const [calendarDate, setCalendarDate] = useState(getTodayDate());
  const [calendarSportFilter, setCalendarSportFilter] = useState("all");

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyBooking, setVerifyBooking] = useState(null);
  const [verifyChecklist, setVerifyChecklist] = useState(DEFAULT_VERIFY_CHECKLIST);
  const [verifyNotes, setVerifyNotes] = useState("");

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectBooking, setRejectBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    facility_id: "",
    maintenance_date: calendarDate,
    start_time: "08:00",
    end_time: "09:00",
    reason: "",
  });
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  const [completionModal, setCompletionModal] = useState(false);
  const [completionBooking, setCompletionBooking] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    completion_status: "completed",
    completion_notes: "",
  });
  const [completionSaving, setCompletionSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const slots = useMemo(() => generateSlots(), []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);
      const completionStatus = normalizeCompletionStatus(booking.completion_status);
      const source = booking.is_walk_in ? "walk_in" : "online";

      const matchesSearch =
        search.trim() === "" ||
        [
          getCustomerName(booking),
          getCustomerEmail(booking),
          getCustomerContact(booking),
          getFacilityName(booking),
          booking.walk_in_customer_name,
          booking.walk_in_contact_number,
          booking.payment_reference,
          booking.receipt_number,
          booking.booking_date,
          booking.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesPayment =
        paymentFilter === "all" || paymentStatus === paymentFilter;
      const matchesCompletion =
        completionFilter === "all" || completionStatus === completionFilter;
      const matchesSource = sourceFilter === "all" || source === sourceFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesCompletion &&
        matchesSource
      );
    });
  }, [bookings, search, statusFilter, paymentFilter, completionFilter, sourceFilter]);

  const calendarBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === calendarDate);
  }, [bookings, calendarDate]);

  const calendarMaintenanceBlocks = useMemo(() => {
    return maintenanceBlocks.filter(
      (block) =>
        block.maintenance_date === calendarDate &&
        normalizeStatus(block.status) === "active"
    );
  }, [maintenanceBlocks, calendarDate]);

  const calendarFacilities = useMemo(() => {
    if (calendarSportFilter === "all") return facilities;

    return facilities.filter(
      (facility) => normalizeFacilityType(facility.type) === calendarSportFilter
    );
  }, [facilities, calendarSportFilter]);

  const summary = useMemo(() => {
    const pendingPayments = bookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "pending_verification"
    ).length;

    const approvedToday = bookings.filter(
      (booking) =>
        booking.booking_date === getTodayDate() &&
        normalizeStatus(booking.status) === "approved"
    ).length;

    const completed = bookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "completed"
    ).length;

    const noShow = bookings.filter(
      (booking) => normalizeCompletionStatus(booking.completion_status) === "no_show"
    ).length;

    return {
      total: bookings.length,
      pendingPayments,
      approvedToday,
      completed,
      noShow,
    };
  }, [bookings]);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`staff-manage-bookings-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_maintenance_blocks" },
        () => {
          loadMaintenanceBlocks(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setMaintenanceForm((prev) => ({
      ...prev,
      maintenance_date: calendarDate,
    }));
  }, [calendarDate]);

  useEffect(() => {
    if (!highlightId || bookings.length === 0) return;

    const booking = bookings.find((item) => String(item.id) === String(highlightId));

    if (booking) {
      openDetailsModal(booking);
    }
  }, [highlightId, bookings.length]);

  async function loadBookings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      let bookingData = [];

      try {
        bookingData = await getAllBookings();
      } catch {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            facilities (*),
            profiles:user_id (
              id,
              full_name,
              email,
              phone,
              contact_number,
              role
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        bookingData = data || [];
      }

      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (facilityError) throw facilityError;

      setBookings(bookingData || []);
      setFacilities(facilityData || []);

      await loadMaintenanceBlocks(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMaintenanceBlocks(showLoading = false) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("facility_maintenance_blocks")
        .select(`
          *,
          facilities (*),
          profiles:created_by (
            id,
            full_name,
            role
          )
        `)
        .order("maintenance_date", { ascending: true });

      if (error) throw error;

      setMaintenanceBlocks(data || []);
    } catch (err) {
      console.error("Failed to load maintenance blocks:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setCompletionFilter("all");
    setSourceFilter("all");
  }

  function openDetailsModal(booking) {
    setSelectedBooking(booking);
    setDetailsModal(true);
  }

  function closeDetailsModal() {
    setSelectedBooking(null);
    setDetailsModal(false);
  }

  function openVerifyModal(booking) {
    setVerifyBooking(booking);
    setVerifyChecklist(DEFAULT_VERIFY_CHECKLIST);
    setVerifyNotes("");
    setVerifyModal(true);
  }

  function closeVerifyModal() {
    if (processingId) return;

    setVerifyBooking(null);
    setVerifyChecklist(DEFAULT_VERIFY_CHECKLIST);
    setVerifyNotes("");
    setVerifyModal(false);
  }

  function toggleVerifyChecklist(name) {
    setVerifyChecklist((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  async function handleVerifyPayment() {
    try {
      if (!verifyBooking?.id) return;

      const checklistValues = Object.values(verifyChecklist);
      const isChecklistComplete = checklistValues.every(Boolean);

      if (!isChecklistComplete) {
        setError("Please complete all verification checklist items first.");
        return;
      }

      setProcessingId(verifyBooking.id);
      setError("");
      setMessage("");

      await verifyPayment(verifyBooking.id, {
        checklist: verifyChecklist,
        notes: verifyNotes,
      });

      setMessage("Payment verified successfully. Booking is now approved and receipt was issued.");
      closeVerifyModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to verify payment.");
    } finally {
      setProcessingId("");
    }
  }

  function openRejectModal(booking) {
    setRejectBooking(booking);
    setRejectReason("");
    setRejectModal(true);
  }

  function closeRejectModal() {
    if (processingId) return;

    setRejectBooking(null);
    setRejectReason("");
    setRejectModal(false);
  }

  async function handleRejectPayment() {
    try {
      if (!rejectBooking?.id) return;

      if (!rejectReason.trim()) {
        setError("Please enter a payment rejection reason.");
        return;
      }

      setProcessingId(rejectBooking.id);
      setError("");
      setMessage("");

      await rejectPayment(rejectBooking.id, rejectReason.trim(), {
        notes: rejectReason.trim(),
        checklist: {
          amount_matches: false,
          proof_readable: false,
          reference_visible: false,
          receiver_confirmed: false,
        },
      });

      setMessage("Payment rejected successfully. The user can upload payment proof again.");
      closeRejectModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reject payment.");
    } finally {
      setProcessingId("");
    }
  }

  async function handleMarkExpired(booking) {
    try {
      setProcessingId(booking.id);
      setError("");
      setMessage("");

      await expireBookingReservation(booking.id);

      setMessage("Reservation marked as expired.");
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark reservation as expired.");
    } finally {
      setProcessingId("");
    }
  }

  function openMaintenanceModal() {
    setMaintenanceForm({
      facility_id: facilities[0]?.id || "",
      maintenance_date: calendarDate,
      start_time: "08:00",
      end_time: "09:00",
      reason: "",
    });
    setMaintenanceModal(true);
  }

  function closeMaintenanceModal() {
    if (maintenanceSaving) return;

    setMaintenanceModal(false);
    setMaintenanceForm({
      facility_id: "",
      maintenance_date: calendarDate,
      start_time: "08:00",
      end_time: "09:00",
      reason: "",
    });
  }

  function handleMaintenanceChange(event) {
    const { name, value } = event.target;

    setMaintenanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreateMaintenanceBlock() {
    try {
      setMaintenanceSaving(true);
      setError("");
      setMessage("");

      if (!maintenanceForm.facility_id) {
        throw new Error("Please select a facility.");
      }

      if (!maintenanceForm.maintenance_date) {
        throw new Error("Please select a maintenance date.");
      }

      if (!maintenanceForm.start_time || !maintenanceForm.end_time) {
        throw new Error("Please select start and end time.");
      }

      if (cleanTime(maintenanceForm.start_time) >= cleanTime(maintenanceForm.end_time)) {
        throw new Error("End time must be later than start time.");
      }

      const { error } = await supabase.from("facility_maintenance_blocks").insert([
        {
          facility_id: maintenanceForm.facility_id,
          maintenance_date: maintenanceForm.maintenance_date,
          start_time: cleanTime(maintenanceForm.start_time),
          end_time: cleanTime(maintenanceForm.end_time),
          reason: maintenanceForm.reason || "Facility maintenance",
          status: "active",
          created_by: user?.id,
        },
      ]);

      if (error) throw error;

      setMessage("Maintenance block added successfully.");
      closeMaintenanceModal();
      await loadMaintenanceBlocks(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add maintenance block.");
    } finally {
      setMaintenanceSaving(false);
    }
  }

  async function handleCancelMaintenanceBlock(block) {
    const confirmed = window.confirm("Cancel this maintenance block?");

    if (!confirmed) return;

    try {
      setProcessingId(block.id);
      setError("");
      setMessage("");

      const { error } = await supabase
        .from("facility_maintenance_blocks")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", block.id);

      if (error) throw error;

      setMessage("Maintenance block cancelled.");
      await loadMaintenanceBlocks(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to cancel maintenance block.");
    } finally {
      setProcessingId("");
    }
  }

  function openCompletionModal(booking, status = "completed") {
    setCompletionBooking(booking);
    setCompletionForm({
      completion_status: status,
      completion_notes: "",
    });
    setCompletionModal(true);
  }

  function closeCompletionModal() {
    if (completionSaving) return;

    setCompletionModal(false);
    setCompletionBooking(null);
    setCompletionForm({
      completion_status: "completed",
      completion_notes: "",
    });
  }

  function handleCompletionChange(event) {
    const { name, value } = event.target;

    setCompletionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmitCompletion() {
    try {
      if (!completionBooking?.id) return;

      setCompletionSaving(true);
      setError("");
      setMessage("");

      await updateBookingCompletionStatus({
        booking_id: completionBooking.id,
        staff_id: user?.id,
        completion_status: completionForm.completion_status,
        completion_notes: completionForm.completion_notes,
      });

      setMessage("Booking completion status updated successfully.");
      closeCompletionModal();
      closeDetailsModal();
      await loadBookings(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update booking completion status.");
    } finally {
      setCompletionSaving(false);
    }
  }

  function getCalendarBooking(facilityId, slot) {
    return calendarBookings.find((booking) => {
      if (!isCalendarBlockingBooking(booking)) return false;
      if (String(booking.facility_id) !== String(facilityId)) return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      );
    });
  }

  function getMaintenanceBlock(facilityId, slot) {
    return calendarMaintenanceBlocks.find((block) => {
      if (String(block.facility_id) !== String(facilityId)) return false;
      if (normalizeStatus(block.status) !== "active") return false;

      return overlaps(
        slot.start_time,
        slot.end_time,
        block.start_time,
        block.end_time
      );
    });
  }

  function goToPreviousDate() {
    setCalendarDate((prev) => addDaysToDateString(prev, -1));
  }

  function goToNextDate() {
    setCalendarDate((prev) => addDaysToDateString(prev, 1));
  }

  return (
    <div className="page-shell">
      <Sidebar role={profile?.role === "admin" ? "admin" : "staff"} />

      <main className="page-main">
        <div className="page-container">
          <Topbar
  title="Manage Bookings"
  subtitle={
    profile?.role === "admin"
      ? "Admin booking and payment management"
      : "Staff booking and payment management"
  }
/>

          {error && <div className="icb-alert-error mb-4">{error}</div>}
          {message && <div className="icb-alert-success mb-4">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold">Staff Booking Management</p>

                <h2 className="mt-2 text-3xl font-black">
                  Manage reservations, payments, maintenance, and completion.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Review payment proof, approve paid bookings, issue receipts, and
                  monitor facility availability.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <HeroStat label="Total" value={summary.total} />
                <HeroStat label="Payment Review" value={summary.pendingPayments} />
                <HeroStat label="Today Approved" value={summary.approvedToday} />
                <HeroStat label="Completed" value={summary.completed} />
                <HeroStat label="No-show" value={summary.noShow} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Booking Tools
                </h3>

                <p className="text-sm text-slate-500">
                  Switch between list and calendar view.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold ${
                    viewMode === "list"
                      ? "bg-[#C97B6C] text-white"
                      : "border border-[#DED8D2] hover:bg-[#F5F3F1]"
                  }`}
                >
                  List View
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold ${
                    viewMode === "calendar"
                      ? "bg-[#C97B6C] text-white"
                      : "border border-[#DED8D2] hover:bg-[#F5F3F1]"
                  }`}
                >
                  Calendar View
                </button>

                <button
                  type="button"
                  onClick={() => loadBookings()}
                  className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    Refresh
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openMaintenanceModal}
                  className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wrench size={16} />
                    Add Maintenance
                  </span>
                </button>
              </div>
            </div>
          </section>

          {viewMode === "list" ? (
            <>
              <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">Filters</h3>

                  <p className="text-sm text-slate-500">
                    Search and filter all bookings.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Search
                    </label>

                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search customer, facility, receipt, reference"
                        className="w-full rounded-2xl border border-[#DED8D2] px-11 py-3 outline-none focus:border-[#C97B6C]"
                      />
                    </div>
                  </div>

                  <FilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "reserved", label: "Reserved" },
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "cancelled", label: "Cancelled" },
                      { value: "expired", label: "Expired" },
                      { value: "rejected", label: "Rejected" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />

                  <FilterSelect
                    label="Payment"
                    value={paymentFilter}
                    onChange={setPaymentFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "unpaid", label: "Unpaid" },
                      { value: "pending_verification", label: "Payment Review" },
                      { value: "paid", label: "Paid" },
                      { value: "rejected_payment", label: "Rejected Payment" },
                      { value: "expired", label: "Expired" },
                    ]}
                  />

                  <FilterSelect
                    label="Completion"
                    value={completionFilter}
                    onChange={setCompletionFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "not_completed", label: "Not Completed" },
                      { value: "completed", label: "Completed" },
                      { value: "no_show", label: "No-show" },
                      { value: "cancelled_late", label: "Cancelled Late" },
                    ]}
                  />

                  <FilterSelect
                    label="Source"
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "online", label: "Online" },
                      { value: "walk_in", label: "Walk-in" },
                    ]}
                  />

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="w-full rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Booking Requests
                    </h3>

                    <p className="text-sm text-slate-500">
                      {filteredBookings.length} booking(s) shown.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading bookings...</p>
                ) : filteredBookings.length === 0 ? (
                  <EmptyState text="No bookings found." />
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        highlighted={String(booking.id) === String(highlightId)}
                        processing={processingId === booking.id}
                        onView={() => openDetailsModal(booking)}
                        onVerify={() => openVerifyModal(booking)}
                        onReject={() => openRejectModal(booking)}
                        onExpire={() => handleMarkExpired(booking)}
                        onCompletion={openCompletionModal}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <CalendarView
              calendarDate={calendarDate}
              facilities={calendarFacilities}
              slots={slots}
              loading={loading}
              calendarSportFilter={calendarSportFilter}
              onCalendarSportFilterChange={setCalendarSportFilter}
              onPrevious={goToPreviousDate}
              onNext={goToNextDate}
              onDateChange={setCalendarDate}
              onAddMaintenance={openMaintenanceModal}
              getCalendarBooking={getCalendarBooking}
              getMaintenanceBlock={getMaintenanceBlock}
              onBookingClick={openDetailsModal}
              onMaintenanceCancel={handleCancelMaintenanceBlock}
            />
          )}

          {detailsModal && selectedBooking && (
            <BookingDetailsModal
              booking={selectedBooking}
              processing={processingId === selectedBooking.id}
              onClose={closeDetailsModal}
              onVerify={() => openVerifyModal(selectedBooking)}
              onReject={() => openRejectModal(selectedBooking)}
              onExpire={() => handleMarkExpired(selectedBooking)}
              onCompletion={openCompletionModal}
            />
          )}

          {verifyModal && verifyBooking && (
            <PaymentVerificationModal
              booking={verifyBooking}
              checklist={verifyChecklist}
              notes={verifyNotes}
              processing={processingId === verifyBooking.id}
              onChecklistChange={toggleVerifyChecklist}
              onNotesChange={setVerifyNotes}
              onClose={closeVerifyModal}
              onConfirm={handleVerifyPayment}
            />
          )}

          {rejectModal && rejectBooking && (
            <RejectPaymentModal
              booking={rejectBooking}
              reason={rejectReason}
              processing={processingId === rejectBooking.id}
              onReasonChange={setRejectReason}
              onClose={closeRejectModal}
              onConfirm={handleRejectPayment}
            />
          )}

          {maintenanceModal && (
            <MaintenanceModal
              facilities={facilities}
              form={maintenanceForm}
              saving={maintenanceSaving}
              onChange={handleMaintenanceChange}
              onClose={closeMaintenanceModal}
              onSubmit={handleCreateMaintenanceBlock}
            />
          )}

          {completionModal && completionBooking && (
            <CompletionModal
              booking={completionBooking}
              form={completionForm}
              saving={completionSaving}
              onChange={handleCompletionChange}
              onClose={closeCompletionModal}
              onSubmit={handleSubmitCompletion}
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
  processing,
  onView,
  onVerify,
  onReject,
  onExpire,
  onCompletion,
}) {
  const status = normalizeStatus(booking.status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const completionStatus = normalizeCompletionStatus(booking.completion_status);
  const minutesLeft = getReservationMinutesLeft(booking);

  return (
    <div
      className={`rounded-[28px] border bg-white p-5 shadow-sm ${
        highlighted
          ? "border-[#C97B6C] ring-4 ring-[#C97B6C]/10"
          : "border-[#DED8D2]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className={getStatusClass(status)}>
              {formatStatusLabel(status)}
            </Badge>

            <Badge className={getPaymentStatusClass(paymentStatus)}>
              {formatStatusLabel(paymentStatus)}
            </Badge>

            <Badge className={getCompletionStatusClass(completionStatus)}>
              {formatCompletionStatus(completionStatus)}
            </Badge>

            {booking.is_walk_in && (
              <Badge className="bg-purple-100 text-purple-700">Walk-in</Badge>
            )}

            {paymentStatus === "pending_verification" && (
              <Badge className="bg-blue-100 text-blue-700">
                Needs Staff Review
              </Badge>
            )}
          </div>

          <h3 className="text-2xl font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Customer: <b>{getCustomerName(booking)}</b>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MiniDetail label="Total" value={money(getBookingTotal(booking))} />
            <MiniDetail label="Paid" value={money(booking.amount_paid || 0)} />
            <MiniDetail label="Balance" value={money(getBalance(booking))} />
            <MiniDetail label="Payment Method" value={booking.payment_method || "-"} />
            <MiniDetail label="Receipt" value={booking.receipt_number || "-"} />
          </div>

          {booking.payment_reference && (
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Reference: <b>{booking.payment_reference}</b>
            </p>
          )}

          {minutesLeft !== null &&
            status === "reserved" &&
            ["unpaid", "rejected_payment"].includes(paymentStatus) && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
                <Clock size={16} />
                {minutesLeft} minute(s) left before expiration
              </p>
            )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:w-[240px] xl:flex-col">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
          >
            <span className="inline-flex items-center gap-2">
              <Eye size={16} />
              View Details
            </span>
          </button>

          {canVerifyPayment(booking) && (
            <button
              type="button"
              onClick={onVerify}
              disabled={processing}
              className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} />
                Verify Payment
              </span>
            </button>
          )}

          {canRejectPayment(booking) && (
            <button
              type="button"
              onClick={onReject}
              disabled={processing}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Reject Payment
            </button>
          )}

          {canMarkExpired(booking) && (
            <button
              type="button"
              onClick={onExpire}
              disabled={processing}
              className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              Mark Expired
            </button>
          )}

          {canCompleteBooking(booking) && (
            <button
              type="button"
              onClick={() => onCompletion(booking, "completed")}
              className="rounded-2xl bg-[#C97B6C] px-4 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
            >
              Complete Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView({
  calendarDate,
  facilities,
  slots,
  loading,
  calendarSportFilter,
  onCalendarSportFilterChange,
  onPrevious,
  onNext,
  onDateChange,
  onAddMaintenance,
  getCalendarBooking,
  getMaintenanceBlock,
  onBookingClick,
  onMaintenanceCancel,
}) {
  return (
    <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#2B2B2B]">
            Staff Booking Calendar
          </h3>

          <p className="text-sm text-slate-500">
            Staff can view customer names and maintenance blocks.
          </p>

          <h4 className="mt-4 text-xl font-black text-[#2B2B2B]">
            {formatDate(calendarDate)}
          </h4>

          <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            <Legend color="bg-green-100 border-green-600" label="Booked / Paid" />
            <Legend color="bg-yellow-100 border-yellow-500" label="Reserved" />
            <Legend color="bg-blue-100 border-blue-500" label="Payment Review" />
            <Legend color="bg-purple-100 border-purple-500" label="Maintenance" />
            <Legend color="bg-slate-100 border-slate-400" label="Open" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {SPORT_FILTERS.map((sport) => (
              <button
                key={sport.value}
                type="button"
                onClick={() => onCalendarSportFilterChange(sport.value)}
                className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                  calendarSportFilter === sport.value
                    ? "bg-[#C97B6C] text-white"
                    : "border border-[#DED8D2] text-slate-600 hover:bg-[#F5F3F1]"
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
          >
            ‹
          </button>

          <input
            type="date"
            value={calendarDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-bold outline-none focus:border-[#C97B6C]"
          />

          <button
            type="button"
            onClick={onNext}
            className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
          >
            ›
          </button>

          <button
            type="button"
            onClick={onAddMaintenance}
            className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
          >
            Add Maintenance
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading calendar...</p>
      ) : facilities.length === 0 ? (
        <EmptyState text="No facilities found." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="w-[150px] border border-[#DED8D2] px-4 py-4 text-left text-[#2B2B2B]">
                  Time
                </th>

                {facilities.map((facility) => (
                  <th
                    key={facility.id}
                    className="border border-[#DED8D2] px-4 py-4 text-center text-[#2B2B2B]"
                  >
                    <div className="font-black">{facility.name}</div>

                    <div className="mt-1 text-xs font-black text-[#C97B6C]">
                      {money(getFacilityRate(facility))}/hr
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {slots.map((slot) => (
                <tr key={slot.label}>
                  <td className="border border-[#DED8D2] px-4 py-4 font-bold text-[#2B2B2B]">
                    {slot.label}
                  </td>

                  {facilities.map((facility) => {
                    const maintenanceBlock = getMaintenanceBlock(facility.id, slot);
                    const booking = getCalendarBooking(facility.id, slot);

                    return (
                      <td
                        key={`${facility.id}-${slot.index}`}
                        className="border border-[#DED8D2] p-1"
                      >
                        {maintenanceBlock ? (
                          <button
                            type="button"
                            onClick={() => onMaintenanceCancel(maintenanceBlock)}
                            className="min-h-[70px] w-full rounded-xl border border-purple-500 bg-purple-100 px-3 py-2 text-center text-xs font-black text-purple-800"
                          >
                            Maintenance
                            <br />
                            <span className="text-xs font-bold">
                              {maintenanceBlock.reason || "Unavailable"}
                            </span>
                            <br />
                            <span className="text-xs font-bold">
                              Click to cancel
                            </span>
                          </button>
                        ) : booking ? (
                          <button
                            type="button"
                            onClick={() => onBookingClick(booking)}
                            className={`min-h-[70px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black ${getCalendarClass(
                              booking
                            )}`}
                          >
                            {normalizeStatus(booking.status) === "approved"
                              ? "Booked"
                              : formatStatusLabel(booking.status)}
                            <br />
                            <span className="text-xs font-bold">
                              {getCustomerName(booking)}
                            </span>
                            <br />
                            <span className="text-xs font-bold">
                              {formatStatusLabel(booking.payment_status)}
                            </span>
                          </button>
                        ) : (
                          <div className="min-h-[70px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-black text-slate-500">
                            Open
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BookingDetailsModal({
  booking,
  processing,
  onClose,
  onVerify,
  onReject,
  onExpire,
  onCompletion,
}) {
  const completionStatus = normalizeCompletionStatus(booking.completion_status);
  const paymentStatus = normalizePaymentStatus(booking.payment_status);
  const proofType = getPaymentProofType(booking.payment_proof_url);

  return (
    <ModalShell title="Booking Details" onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex flex-wrap gap-2">
        <Badge className={getStatusClass(booking.status)}>
          {formatStatusLabel(booking.status)}
        </Badge>

        <Badge className={getPaymentStatusClass(booking.payment_status)}>
          {formatStatusLabel(booking.payment_status)}
        </Badge>

        <Badge className={getCompletionStatusClass(completionStatus)}>
          {formatCompletionStatus(completionStatus)}
        </Badge>

        {booking.is_walk_in && (
          <Badge className="bg-purple-100 text-purple-700">Walk-in</Badge>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Customer" value={getCustomerName(booking)} />
            <DetailItem label="Email" value={getCustomerEmail(booking)} />
            <DetailItem label="Contact" value={getCustomerContact(booking)} />
            <DetailItem label="Facility" value={getFacilityName(booking)} />
            <DetailItem label="Date" value={formatDate(booking.booking_date)} />
            <DetailItem
              label="Time"
              value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
            />
            <DetailItem label="Session Type" value={formatStatusLabel(booking.session_type)} />
            <DetailItem label="Total Hours" value={`${booking.total_hours || 0} hour(s)`} />
            <DetailItem label="Rate Per Hour" value={money(booking.rate_per_hour)} />
            <DetailItem label="Total Amount" value={money(getBookingTotal(booking))} />
            <DetailItem label="Amount Paid" value={money(booking.amount_paid || 0)} />
            <DetailItem label="Balance" value={money(getBalance(booking))} />
            <DetailItem label="Payment Method" value={booking.payment_method || "-"} />
            <DetailItem label="Payment Reference" value={booking.payment_reference || "-"} />
            <DetailItem label="Receipt Number" value={booking.receipt_number || "-"} />
            <DetailItem label="Created At" value={formatDateTime(booking.created_at)} />
            <DetailItem label="Payment Submitted" value={formatDateTime(booking.payment_submitted_at)} />
            <DetailItem label="Payment Verified" value={formatDateTime(booking.payment_verified_at)} />
          </div>

          {booking.payment_notes && (
            <ReasonBox title="Payment Notes" value={booking.payment_notes} tone="slate" />
          )}

          {booking.payment_verification_notes && (
            <ReasonBox
              title="Verification Notes"
              value={booking.payment_verification_notes}
              tone="green"
            />
          )}

          {booking.payment_rejection_reason && (
            <ReasonBox
              title="Payment Rejection Reason"
              value={booking.payment_rejection_reason}
              tone="red"
            />
          )}

          {booking.completion_notes && completionStatus !== "not_completed" && (
            <ReasonBox title="Completion Notes" value={booking.completion_notes} tone="slate" />
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
            <p className="text-sm font-black text-[#0B1F33]">Payment Proof</p>

            {booking.payment_proof_url ? (
              <>
                {proofType === "image" ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#DED8D2] bg-white p-3">
                    <img
                      src={booking.payment_proof_url}
                      alt="Payment Proof"
                      className="mx-auto max-h-[360px] w-full rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-white p-4 text-sm font-bold text-slate-600">
                    PDF payment proof uploaded.
                  </div>
                )}

                <a
                  href={booking.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                >
                  <FileImage size={16} />
                  Open Payment Proof
                </a>
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#DED8D2] bg-white p-6 text-center text-sm font-bold text-slate-500">
                No payment proof uploaded.
              </div>
            )}
          </section>

          {canCompleteBooking(booking) && (
            <section className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
              <p className="text-sm font-black text-[#0B1F33]">
                Booking Completion
              </p>

              <p className="mt-1 text-sm text-slate-500">
                This booking time has ended. Mark the final attendance result.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => onCompletion(booking, "completed")}
                  className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
                >
                  Mark Completed
                </button>

                <button
                  type="button"
                  onClick={() => onCompletion(booking, "no_show")}
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  Mark No-show
                </button>

                <button
                  type="button"
                  onClick={() => onCompletion(booking, "cancelled_late")}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Mark Cancelled Late
                </button>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-[#DED8D2] bg-white p-4">
            <p className="text-sm font-black text-[#0B1F33]">Actions</p>

            <div className="mt-4 flex flex-col gap-3">
              {canMarkExpired(booking) && (
                <button
                  type="button"
                  onClick={onExpire}
                  disabled={processing}
                  className="rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  Mark Expired
                </button>
              )}

              {canRejectPayment(booking) && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={processing}
                  className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject Payment
                </button>
              )}

              {canVerifyPayment(booking) && (
                <button
                  type="button"
                  onClick={onVerify}
                  disabled={processing}
                  className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Verify Payment
                </button>
              )}

              {paymentStatus === "paid" && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Printer size={17} />
                    Print Receipt
                  </span>
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </ModalShell>
  );
}

function PaymentVerificationModal({
  booking,
  checklist,
  notes,
  processing,
  onChecklistChange,
  onNotesChange,
  onClose,
  onConfirm,
}) {
  const proofType = getPaymentProofType(booking.payment_proof_url);

  return (
    <ModalShell title="Verify Payment" onClose={onClose} maxWidth="max-w-5xl">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="rounded-3xl bg-green-50 p-5">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              Confirm payment verification
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              This will approve the booking and issue a receipt.
            </h2>

            <p className="mt-2 text-sm font-semibold text-green-700">
              Verify only if the proof is clear, the reference is visible, and the
              amount matches the actual payment received.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <MiniDetail label="Customer" value={getCustomerName(booking)} />
            <MiniDetail label="Facility" value={getFacilityName(booking)} />
            <MiniDetail label="Total Amount" value={money(getBookingTotal(booking))} />
            <MiniDetail label="Amount Paid" value={money(booking.amount_paid)} />
            <MiniDetail label="Balance" value={money(getBalance(booking))} />
            <MiniDetail label="Payment Method" value={booking.payment_method || "-"} />
            <MiniDetail label="Reference" value={booking.payment_reference || "-"} />
            <MiniDetail label="Submitted At" value={formatDateTime(booking.payment_submitted_at)} />
          </div>

          <div className="mt-5 rounded-3xl border border-[#DED8D2] bg-white p-5">
            <p className="text-sm font-black text-[#0B1F33]">
              Verification Checklist
            </p>

            <div className="mt-4 space-y-3">
              <ChecklistItem
                label="Amount paid matches the booking total."
                checked={checklist.amount_matches}
                onChange={() => onChecklistChange("amount_matches")}
              />

              <ChecklistItem
                label="Payment proof is readable and not blurry."
                checked={checklist.proof_readable}
                onChange={() => onChecklistChange("proof_readable")}
              />

              <ChecklistItem
                label="Payment reference number is visible or provided."
                checked={checklist.reference_visible}
                onChange={() => onChecklistChange("reference_visible")}
              />

              <ChecklistItem
                label="Payment was received in the correct account."
                checked={checklist.receiver_confirmed}
                onChange={() => onChecklistChange("receiver_confirmed")}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="icb-label">Verification Notes</label>

            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Optional notes for this payment verification"
              className="icb-textarea min-h-[120px]"
            />
          </div>

          <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="icb-btn-light"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={processing}
              className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle size={18} />
                {processing ? "Verifying..." : "Verify Payment"}
              </span>
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
          <p className="text-sm font-black text-[#0B1F33]">Payment Proof</p>

          {booking.payment_proof_url ? (
            <>
              {proofType === "image" ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#DED8D2] bg-white p-3">
                  <img
                    src={booking.payment_proof_url}
                    alt="Payment Proof"
                    className="mx-auto max-h-[420px] w-full rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-2xl bg-white p-4 text-sm font-bold text-slate-600">
                  PDF payment proof uploaded.
                </div>
              )}

              <a
                href={booking.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
              >
                <FileImage size={16} />
                Open Proof
              </a>
            </>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-[#DED8D2] bg-white p-6 text-center text-sm font-bold text-slate-500">
              No payment proof uploaded.
            </div>
          )}
        </aside>
      </div>
    </ModalShell>
  );
}

function RejectPaymentModal({
  booking,
  reason,
  processing,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  return (
    <ModalShell title="Reject Payment" onClose={onClose} maxWidth="max-w-2xl">
      <div className="rounded-3xl bg-red-50 p-5">
        <p className="text-sm font-black uppercase tracking-widest text-red-700">
          Payment Rejection
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
          Enter a clear reason for rejection.
        </h2>

        <p className="mt-2 text-sm font-semibold text-red-700">
          The user will see this reason and can upload a new proof again before
          the reservation expires.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <MiniDetail label="Customer" value={getCustomerName(booking)} />
        <MiniDetail label="Facility" value={getFacilityName(booking)} />
        <MiniDetail label="Amount Paid" value={money(booking.amount_paid)} />
        <MiniDetail label="Reference" value={booking.payment_reference || "-"} />
      </div>

      <div className="mt-5">
        <label className="icb-label">Rejection Reason</label>

        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Example: Payment proof is blurry or amount does not match."
          className="icb-textarea min-h-[130px]"
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="icb-btn-light"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={processing}
          className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <XCircle size={18} />
            {processing ? "Rejecting..." : "Reject Payment"}
          </span>
        </button>
      </div>
    </ModalShell>
  );
}

function MaintenanceModal({
  facilities,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <ModalShell title="Add Maintenance Block" onClose={onClose} maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="icb-label">Facility</label>

          <select
            name="facility_id"
            value={form.facility_id}
            onChange={onChange}
            className="icb-select"
          >
            <option value="">Select facility</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="icb-label">Date</label>

          <input
            type="date"
            name="maintenance_date"
            value={form.maintenance_date}
            onChange={onChange}
            className="icb-input"
          />
        </div>

        <div>
          <label className="icb-label">Start Time</label>

          <input
            type="time"
            name="start_time"
            value={form.start_time}
            onChange={onChange}
            className="icb-input"
          />
        </div>

        <div>
          <label className="icb-label">End Time</label>

          <input
            type="time"
            name="end_time"
            value={form.end_time}
            onChange={onChange}
            className="icb-input"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="icb-label">Reason</label>

        <textarea
          name="reason"
          value={form.reason}
          onChange={onChange}
          placeholder="Example: Court cleaning, repair, private maintenance."
          className="icb-textarea min-h-[110px]"
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="icb-btn-light"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add Maintenance"}
        </button>
      </div>
    </ModalShell>
  );
}

function CompletionModal({
  booking,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <ModalShell title="Booking Completion" onClose={onClose} maxWidth="max-w-2xl">
      <div className="rounded-2xl bg-[#F5F3F1] p-4">
        <p className="text-sm font-black text-[#2B2B2B]">Booking Information</p>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <MiniDetail label="Facility" value={getFacilityName(booking)} />
          <MiniDetail label="Date" value={formatDate(booking.booking_date)} />
          <MiniDetail
            label="Time"
            value={`${formatTime(booking.start_time)} - ${formatTime(
              booking.end_time
            )}`}
          />
          <MiniDetail label="Customer" value={getCustomerName(booking)} />
        </div>
      </div>

      <div className="mt-5">
        <label className="icb-label">Completion Status</label>

        <select
          name="completion_status"
          value={form.completion_status}
          onChange={onChange}
          className="icb-select"
        >
          <option value="completed">Completed</option>
          <option value="no_show">No-show</option>
          <option value="cancelled_late">Cancelled Late</option>
        </select>
      </div>

      <div className="mt-5">
        <label className="icb-label">Completion Notes</label>

        <textarea
          name="completion_notes"
          value={form.completion_notes}
          onChange={onChange}
          placeholder="Optional notes about the booking result"
          className="icb-textarea min-h-[110px]"
        />
      </div>

      <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="icb-btn-light"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="icb-btn-accent"
        >
          {saving ? "Saving..." : "Save Completion Status"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children, maxWidth = "max-w-5xl" }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0B1F33]/60 px-4 py-6 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C97B6C]">
              InCredoBall
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#0B1F33]">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] text-[#0B1F33] transition hover:bg-[#F5F3F1]"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChecklistItem({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={onChange}
        className="h-5 w-5 accent-green-600"
      />

      <span className="text-sm font-bold text-[#0B1F33]">{label}</span>
    </label>
  );
}

function MiniDetail({ label, value }) {
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

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#2B2B2B]">
        {value || "-"}
      </p>
    </div>
  );
}

function ReasonBox({ title, value, tone = "red" }) {
  const classes = {
    red: "bg-red-50 text-red-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className={`mt-5 rounded-2xl p-4 ${classes[tone] || classes.slate}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${color}`}></span>
      {label}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-sm text-slate-500">
      {text}
    </div>
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

function Badge({ children, className }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${className}`}>
      {children}
    </span>
  );
}