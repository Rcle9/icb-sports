import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import {
  createBooking,
  expireBookingReservation,
} from "../../services/bookingService";
import { getReservationExpirationMinutes } from "../../services/paymentSettingsService";
import { useAuth } from "../../context/AuthContext";

const FACILITY_FALLBACK = "https://via.placeholder.com/800x500?text=Facility";

const SPORT_TYPES = [
  { value: "pickleball", label: "Pickleball" },
  { value: "basketball", label: "Basketball" },
  { value: "table_tennis", label: "Table Tennis" },
];

const SESSION_TYPES = [
  { value: "training", label: "Training" },
  { value: "instructional", label: "Instructional" },
  { value: "recreational", label: "Recreational" },
];

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function cleanTime(time) {
  if (!time) return "08:00";
  return String(time).slice(0, 5);
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

function getCurrentTimeValue() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function isPastSlot(bookingDate, slot) {
  const today = getTodayDate();

  if (!bookingDate) return false;

  if (bookingDate < today) return true;
  if (bookingDate > today) return false;

  return cleanTime(slot.end_time) <= getCurrentTimeValue();
}

function formatTime(time24) {
  if (!time24) return "";

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function normalizeFacilityType(value) {
  const type = String(value || "").toLowerCase().trim();

  if (type.includes("pickle")) return "pickleball";
  if (type.includes("basket")) return "basketball";
  if (type.includes("table") || type.includes("tennis")) return "table_tennis";

  return type.replaceAll(" ", "_");
}

function getFacilityImages(item) {
  const images = [
    ...(Array.isArray(item?.image_urls) ? item.image_urls : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    item?.image_url,
    item?.image,
  ].filter(Boolean);

  return [...new Set(images)].length ? [...new Set(images)] : [FACILITY_FALLBACK];
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

function hoursBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = cleanTime(start).split(":").map(Number);
  const [eh, em] = cleanTime(end).split(":").map(Number);

  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return cleanTime(aStart) < cleanTime(bEnd) && cleanTime(aEnd) > cleanTime(bStart);
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

function buildSelectedGroups(selectedSlots, slots, facilities) {
  const groupedByFacility = new Map();

  selectedSlots.forEach((item) => {
    if (!groupedByFacility.has(item.facility_id)) {
      groupedByFacility.set(item.facility_id, []);
    }

    groupedByFacility.get(item.facility_id).push(item.slot_index);
  });

  const groups = [];

  groupedByFacility.forEach((indexes, facilityId) => {
    const facility = facilities.find(
      (item) => String(item.id) === String(facilityId)
    );

    const sortedIndexes = [...indexes].sort((a, b) => a - b);

    if (sortedIndexes.length === 0) return;

    let currentGroup = [sortedIndexes[0]];

    for (let i = 1; i < sortedIndexes.length; i += 1) {
      const currentIndex = sortedIndexes[i];
      const previousIndex = sortedIndexes[i - 1];

      if (currentIndex === previousIndex + 1) {
        currentGroup.push(currentIndex);
      } else {
        groups.push(buildGroup(currentGroup, facility, slots));
        currentGroup = [currentIndex];
      }
    }

    groups.push(buildGroup(currentGroup, facility, slots));
  });

  return groups.filter(Boolean);
}

function buildGroup(indexes, facility, slots) {
  if (!facility || indexes.length === 0) return null;

  const groupSlots = indexes.map((index) => slots[index]);
  const startTime = groupSlots[0]?.start_time || "";
  const endTime = groupSlots[groupSlots.length - 1]?.end_time || "";
  const totalHours = hoursBetween(startTime, endTime);
  const rate = getFacilityRate(facility);

  return {
    facility,
    facility_id: facility.id,
    indexes,
    slots: groupSlots,
    start_time: startTime,
    end_time: endTime,
    total_hours: totalHours,
    rate_per_hour: rate,
    total_amount: totalHours * rate,
  };
}

function getSelectionKey(facilityId, slotIndex) {
  return `${facilityId}-${slotIndex}`;
}

function getUserBlockedClass(booking) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (status === "approved" || paymentStatus === "paid") {
    return "cursor-not-allowed border-[#9CA3AF] bg-[#E5E7EB] text-[#374151]";
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return "cursor-not-allowed border-[#60A5FA] bg-[#DBEAFE] text-[#1D4ED8]";
  }

  if (status === "pending") {
    return "cursor-not-allowed border-[#60A5FA] bg-[#DBEAFE] text-[#1D4ED8]";
  }

  if (status === "reserved") {
    return "cursor-not-allowed border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]";
  }

  return "cursor-not-allowed border-[#9CA3AF] bg-[#E5E7EB] text-[#374151]";
}

export default function Booking() {
  const navigate = useNavigate();
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [bookingsForDate, setBookingsForDate] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

  const [selectedSport, setSelectedSport] = useState("pickleball");
  const [reservationMinutes, setReservationMinutes] = useState(15);
  const [selectedSlots, setSelectedSlots] = useState([]);

  const [form, setForm] = useState({
    booking_date: getTodayDate(),
    session_type: "training",
    notes: "",
  });

  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const slots = useMemo(() => generateSlots(), []);

  const selectedSportLabel = useMemo(() => {
    return (
      SPORT_TYPES.find((sport) => sport.value === selectedSport)?.label ||
      "Facility"
    );
  }, [selectedSport]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(
      (facility) => normalizeFacilityType(facility.type) === selectedSport
    );
  }, [facilities, selectedSport]);

  const selectedGroups = useMemo(() => {
    return buildSelectedGroups(selectedSlots, slots, filteredFacilities);
  }, [selectedSlots, slots, filteredFacilities]);

  const totalHours = useMemo(() => {
    return selectedGroups.reduce(
      (sum, group) => sum + Number(group.total_hours || 0),
      0
    );
  }, [selectedGroups]);

  const totalAmount = useMemo(() => {
    return selectedGroups.reduce(
      (sum, group) => sum + Number(group.total_amount || 0),
      0
    );
  }, [selectedGroups]);

  useEffect(() => {
    if (!user?.id) return;

    loadFacilities();
    loadReservationMinutes();
  }, [user?.id]);

  useEffect(() => {
    if (form.booking_date) {
      loadBookingsForDate();
      loadMaintenanceBlocksForDate();
    }
  }, [form.booking_date, facilities.length]);

  useEffect(() => {
    setSelectedSlots([]);
    setError("");
    setMessage("");
  }, [selectedSport]);

  useEffect(() => {
    if (!form.booking_date) return;

    const channel = supabase
      .channel(`booking-calendar-${form.booking_date}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadBookingsForDate(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_maintenance_blocks",
        },
        () => {
          loadMaintenanceBlocksForDate(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_settings",
        },
        () => {
          loadReservationMinutes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [form.booking_date]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (form.booking_date) {
        loadBookingsForDate(false);
        loadMaintenanceBlocksForDate(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [form.booking_date, facilities.length]);

  async function loadReservationMinutes() {
    try {
      const minutes = await getReservationExpirationMinutes();
      setReservationMinutes(minutes);
    } catch (err) {
      console.error("Failed to load reservation minutes:", err.message);
      setReservationMinutes(15);
    }
  }

  async function loadFacilities() {
    try {
      setLoadingFacilities(true);
      setError("");

      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("name", {
          ascending: true,
        });

      if (error) throw error;

      const activeFacilities = (data || []).filter((facility) => {
        if (facility.is_active === undefined || facility.is_active === null) {
          return true;
        }

        return facility.is_active;
      });

      setFacilities(activeFacilities);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoadingFacilities(false);
    }
  }

  async function loadMaintenanceBlocksForDate() {
    try {
      if (!form.booking_date) return;

      const { data, error } = await supabase
        .from("facility_maintenance_blocks")
        .select(`
          *,
          facilities (*)
        `)
        .eq("maintenance_date", form.booking_date)
        .eq("status", "active");

      if (error) throw error;

      setMaintenanceBlocks(data || []);
    } catch (err) {
      console.error("Failed to load maintenance blocks:", err);
    }
  }

  async function expireOldReservations(bookings) {
    const expiredBookings = (bookings || []).filter(isExpiredReservedBooking);

    if (expiredBookings.length === 0) return false;

    await Promise.all(
      expiredBookings.map((booking) => expireBookingReservation(booking.id))
    );

    return true;
  }

  async function loadBookingsForDate(showLoading = true) {
    try {
      if (!form.booking_date) return;

      if (showLoading) setLoadingSchedule(true);

      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .eq("booking_date", form.booking_date)
        .in("status", ["reserved", "pending", "approved"]);

      if (error) throw error;

      const didExpire = await expireOldReservations(data || []);

      if (didExpire) {
        const { data: refreshedData, error: refreshedError } = await supabase
          .from("bookings")
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              role
            )
          `)
          .eq("booking_date", form.booking_date)
          .in("status", ["reserved", "pending", "approved"]);

        if (refreshedError) throw refreshedError;

        setBookingsForDate(refreshedData || []);
        return;
      }

      setBookingsForDate(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "booking_date") {
      setSelectedSlots([]);
    }
  }

  function handleSportChange(sport) {
    setSelectedSport(sport);
  }

  function goToPreviousDate() {
  const previousDate = addDaysToDateString(form.booking_date, -1);
  const today = getTodayDate();

  if (previousDate < today) {
    setForm((prev) => ({
      ...prev,
      booking_date: today,
    }));

    setSelectedSlots([]);
    return;
  }

  setForm((prev) => ({
    ...prev,
    booking_date: previousDate,
  }));

  setSelectedSlots([]);
}

  function goToNextDate() {
    const nextValue = addDaysToDateString(form.booking_date, 1);

    setForm((prev) => ({
      ...prev,
      booking_date: nextValue,
    }));

    setSelectedSlots([]);
  }

  function getMaintenanceBlock(facilityId, slot) {
    return (maintenanceBlocks || []).find((block) => {
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

  function getBlockingBooking(facilityId, slot) {
    return (bookingsForDate || []).find((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);

      if (String(booking.facility_id) !== String(facilityId)) return false;

      if (!["reserved", "pending", "approved"].includes(status)) return false;

      if (
        status === "reserved" &&
        ["unpaid", "rejected_payment"].includes(paymentStatus) &&
        isExpiredReservedBooking(booking)
      ) {
        return false;
      }

      return overlaps(
        slot.start_time,
        slot.end_time,
        booking.start_time,
        booking.end_time
      );
    });
  }

  function isSlotBlocked(facilityId, slot) {
    return (
      isPastSlot(form.booking_date, slot) ||
      Boolean(getBlockingBooking(facilityId, slot)) ||
      Boolean(getMaintenanceBlock(facilityId, slot))
    );
  }

  function isSlotSelected(facilityId, slotIndex) {
    return selectedSlots.some(
      (item) =>
        String(item.facility_id) === String(facilityId) &&
        Number(item.slot_index) === Number(slotIndex)
    );
  }

  function handleSlotClick(facility, slot) {
    if (isPastSlot(form.booking_date, slot)) {
      setError("Past time slots are no longer available.");
      return;
    }

    const maintenanceBlock = getMaintenanceBlock(facility.id, slot);

    if (maintenanceBlock) {
      setError("This facility is under maintenance during this timeslot.");
      loadMaintenanceBlocksForDate(false);
      return;
    }

    const blockingBooking = getBlockingBooking(facility.id, slot);

    if (blockingBooking) {
      setError("This timeslot is already reserved or booked.");
      loadBookingsForDate(false);
      return;
    }

    setError("");
    setMessage("");

    setSelectedSlots((prev) => {
      const exists = prev.some(
        (item) =>
          String(item.facility_id) === String(facility.id) &&
          Number(item.slot_index) === Number(slot.index)
      );

      if (exists) {
        return prev.filter(
          (item) =>
            !(
              String(item.facility_id) === String(facility.id) &&
              Number(item.slot_index) === Number(slot.index)
            )
        );
      }

      return [
        ...prev,
        {
          facility_id: facility.id,
          slot_index: slot.index,
        },
      ];
    });
  }

  function selectAllOpenSlots() {
    const openSlots = [];

    filteredFacilities.forEach((facility) => {
      slots.forEach((slot) => {
        if (!isPastSlot(form.booking_date, slot) && !isSlotBlocked(facility.id, slot)) {
          openSlots.push({
            facility_id: facility.id,
            slot_index: slot.index,
          });
        }
      });
    });

    setSelectedSlots(openSlots);
  }

  function validateBeforeConfirm() {
    setError("");
    setMessage("");

    if (!user?.id) {
      setError("Please login first.");
      return false;
    }

    if (!form.booking_date) {
      setError("Please select a booking date.");
      return false;
    }

    if (form.booking_date < getTodayDate()) {
      setError("Past dates are not allowed.");
      return false;
    }

    if (filteredFacilities.length === 0) {
      setError(`No active ${selectedSportLabel} facility found.`);
      return false;
    }

    if (selectedSlots.length === 0 || selectedGroups.length === 0) {
      setError("Please select at least one time slot.");
      return false;
    }

    const selectedHasBlockedSlot = selectedSlots.some((item) => {
      const slot = slots[item.slot_index];

      return (
        isPastSlot(form.booking_date, slot) ||
        isSlotBlocked(item.facility_id, slot)
      );
    });

    if (selectedHasBlockedSlot) {
      setError("Selected time includes unavailable slots.");
      loadBookingsForDate(false);
      loadMaintenanceBlocksForDate(false);
      return false;
    }

    return true;
  }

  function openConfirmModal() {
    if (!validateBeforeConfirm()) return;

    setConfirmModal(true);
  }

  function closeConfirmModal() {
    if (submitting) return;
    setConfirmModal(false);
  }

  async function confirmBookingSubmit() {
    if (!validateBeforeConfirm()) return;

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await loadBookingsForDate(false);
      await loadMaintenanceBlocksForDate(false);

      const selectedHasBlockedSlot = selectedSlots.some((item) => {
        const slot = slots[item.slot_index];

        return (
          isPastSlot(form.booking_date, slot) ||
          isSlotBlocked(item.facility_id, slot)
        );
      });

      if (selectedHasBlockedSlot) {
        setError("One of your selected slots is already unavailable.");
        setConfirmModal(false);
        return;
      }

      const createdBookings = [];

      for (const group of selectedGroups) {
        const savedBooking = await createBooking({
          user_id: user.id,
          facility_id: group.facility_id,
          booking_date: form.booking_date,
          start_time: group.start_time,
          end_time: group.end_time,
          session_type: form.session_type,
          notes: form.notes || "",
          total_hours: group.total_hours,
          rate_per_hour: group.rate_per_hour,
          total_amount: group.total_amount,
        });

        if (savedBooking?.id) {
          createdBookings.push(savedBooking);
        }
      }

      setSelectedSlots([]);
      setForm((prev) => ({
        ...prev,
        notes: "",
      }));

      setConfirmModal(false);

      await loadBookingsForDate(false);

      const firstBooking = createdBookings[0];

      if (firstBooking?.id) {
        navigate(`/my-bookings?highlight=${firstBooking.id}&pay=1`);
        return;
      }

      setMessage(
        "Booking reserved successfully. Go to My Bookings to upload your payment proof."
      );
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Failed to submit booking. The selected slot may already be reserved, booked, past time, or under maintenance."
      );
      setConfirmModal(false);
      await loadBookingsForDate(false);
      await loadMaintenanceBlocksForDate(false);
    } finally {
      setSubmitting(false);
    }
  }

  function resetSelection() {
    setSelectedSlots([]);
    setMessage("");
    setError("");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3F1] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-4 shadow text-[#2B2B2B]">
          Loading...
        </div>
      </div>
    );
  }

  if (authProfile?.role === "staff") {
    return <Navigate to="/staff/dashboard" replace />;
  }

  if (authProfile?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Facility Booking" />

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
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">Court Schedule Booking</p>

                <h2 className="mt-2 text-3xl font-black">
                  Choose a sport, select a court, and reserve your time slot.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  The calendar is filtered by sport type. Each court or table has
                  its own column to prevent double-booking.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-widest">
                  Reservation Timer
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {reservationMinutes} min
                </h3>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-2xl font-black text-[#2B2B2B]">
                Choose Sport
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Select a sport to show its available courts or tables.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {SPORT_TYPES.map((sport) => (
                <button
                  key={sport.value}
                  type="button"
                  onClick={() => handleSportChange(sport.value)}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${
                    selectedSport === sport.value
                      ? "border-[#C97B6C] bg-[#F3E4DF] text-[#C97B6C] ring-2 ring-[#C97B6C]/20"
                      : "border-[#DED8D2] bg-white text-[#2B2B2B] hover:bg-[#F5F3F1]"
                  }`}
                >
                  <p className="text-lg font-black">{sport.label}</p>

                  <p className="mt-1 text-sm font-semibold opacity-80">
                    {sport.value === "pickleball" &&
                      "6 pickleball courts available"}
                    {sport.value === "basketball" &&
                      "1 basketball court available"}
                    {sport.value === "table_tennis" &&
                      "2 table tennis tables available"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  {selectedSportLabel} Facilities
                </h3>

                <p className="text-sm text-slate-500">
                  Facility cards show prices. The calendar below shows only{" "}
                  {selectedSportLabel.toLowerCase()} schedules.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {selectedSlots.length} selected slot(s)
              </span>
            </div>

            {loadingFacilities ? (
              <p className="text-sm text-slate-500">Loading facilities...</p>
            ) : filteredFacilities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No active {selectedSportLabel} facility found. Please add this
                facility type in admin Facility Management.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredFacilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Booking Date
                </label>

                <input
                  type="date"
                  name="booking_date"
                  value={form.booking_date}
                  min={getTodayDate()}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Session Type
                </label>

                <select
                  name="session_type"
                  value={form.session_type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={selectAllOpenSlots}
                  className="w-full rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Select All Open
                </button>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetSelection}
                  className="w-full rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">Notes</label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional notes for your booking"
                className="min-h-[90px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  {selectedSportLabel} Schedule Calendar
                </h3>

                <p className="text-sm text-slate-500">
                  Rows are time slots. Columns are courts or tables. Customer
                  names are hidden for privacy.
                </p>

                <h4 className="mt-4 text-xl font-black text-[#2B2B2B]">
                  {formatDate(form.booking_date)}
                </h4>

                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                  <Legend color="bg-[#DCFCE7] border-[#4ADE80]" label="Open" />
                  <Legend color="bg-[#F3E4DF] border-[#C97B6C]" label="Selected" />
                  <Legend color="bg-[#FEF3C7] border-[#F59E0B]" label="Reserved" />
                  <Legend color="bg-[#DBEAFE] border-[#60A5FA]" label="Payment Review" />
                  <Legend color="bg-[#E5E7EB] border-[#9CA3AF]" label="Booked / Paid" />
                  <Legend color="bg-[#EDE9FE] border-[#A78BFA]" label="Maintenance" />
                  <Legend color="bg-slate-200 border-slate-400" label="Past Time" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousDate}
                  disabled={form.booking_date <= getTodayDate()}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ‹
                </button>

                <input
                  type="date"
                  name="booking_date"
                  value={form.booking_date}
                  min={getTodayDate()}
                  onChange={handleChange}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-bold outline-none focus:border-[#C97B6C]"
                />

                <button
                  type="button"
                  onClick={goToNextDate}
                  className="rounded-2xl border border-[#DED8D2] px-4 py-3 font-black hover:bg-[#F5F3F1]"
                >
                  ›
                </button>
              </div>
            </div>

            {filteredFacilities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No {selectedSportLabel.toLowerCase()} facilities found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-[140px] border border-[#DED8D2] px-4 py-4 text-left text-[#2B2B2B]">
                        Time
                      </th>

                      {filteredFacilities.map((facility) => (
                        <th
                          key={facility.id}
                          className="border border-[#DED8D2] px-4 py-4 text-center text-[#2B2B2B]"
                        >
                          <div className="font-black">{facility.name}</div>

                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {facility.type || "Facility"}
                          </div>

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

                        {filteredFacilities.map((facility) => {
                          const pastSlot = isPastSlot(form.booking_date, slot);
                          const maintenanceBlock = getMaintenanceBlock(facility.id, slot);
                          const blockingBooking = getBlockingBooking(facility.id, slot);

                          const blocked =
                            pastSlot ||
                            Boolean(blockingBooking) ||
                            Boolean(maintenanceBlock);

                          const selected = isSlotSelected(facility.id, slot.index);

                          const minutesLeft = blockingBooking
                            ? getReservationMinutesLeft(blockingBooking)
                            : null;

                          return (
                            <td
                              key={getSelectionKey(facility.id, slot.index)}
                              className="border border-[#DED8D2] p-1"
                            >
                              <button
                                type="button"
                                disabled={blocked || loadingSchedule}
                                onClick={() => handleSlotClick(facility, slot)}
                                className={`min-h-[64px] w-full rounded-xl border px-3 py-2 text-center text-xs font-black transition ${
                                  blocked
                                    ? pastSlot
                                      ? "cursor-not-allowed border-slate-400 bg-slate-200 text-slate-600"
                                      : maintenanceBlock
                                      ? "cursor-not-allowed border-[#A78BFA] bg-[#EDE9FE] text-[#6D28D9]"
                                      : getUserBlockedClass(blockingBooking)
                                    : selected
                                    ? "border-[#C97B6C] bg-[#F3E4DF] text-[#C97B6C] ring-2 ring-[#C97B6C]/25"
                                    : "border-[#4ADE80] bg-[#DCFCE7] text-[#166534] hover:bg-[#CFF7DA]"
                                }`}
                              >
                                {pastSlot ? (
                                  <PastSlotLabel />
                                ) : maintenanceBlock ? (
                                  <MaintenanceSlotLabel block={maintenanceBlock} />
                                ) : blocked ? (
                                  <PrivateBlockedSlotLabel
                                    booking={blockingBooking}
                                    minutesLeft={minutesLeft}
                                  />
                                ) : selected ? (
                                  "Selected - Click to Deselect"
                                ) : (
                                  "Open - Click to Select"
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#F5F3F1] p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#2B2B2B]">
                  Selected Booking Summary
                </p>

                {selectedGroups.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">
                    No time slot selected yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>
                      {selectedSlots.length} slot(s) selected • {totalHours} total hour(s) •{" "}
                      <b>{money(totalAmount)}</b>
                    </p>

                    <p className="text-xs text-slate-500">
                      Non-continuous selected slots will be saved as separate reservation requests.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openConfirmModal}
                disabled={selectedGroups.length === 0}
                className="rounded-2xl bg-[#C97B6C] px-6 py-4 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Review Reservation
              </button>
            </div>
          </section>

          {confirmModal && (
            <ConfirmBookingModal
              selectedGroups={selectedGroups}
              bookingDate={form.booking_date}
              sessionType={form.session_type}
              notes={form.notes}
              totalHours={totalHours}
              totalAmount={totalAmount}
              reservationMinutes={reservationMinutes}
              submitting={submitting}
              onClose={closeConfirmModal}
              onEdit={closeConfirmModal}
              onConfirm={confirmBookingSubmit}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function FacilityCard({ facility }) {
  const images = getFacilityImages(facility);
  const rate = getFacilityRate(facility);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DED8D2] bg-white">
      <img
        src={images[0]}
        alt={facility.name}
        className="h-36 w-full object-cover"
        onError={(event) => {
          event.currentTarget.src = FACILITY_FALLBACK;
        }}
      />

      <div className="p-4">
        <p className="text-lg font-black text-[#2B2B2B]">{facility.name}</p>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {facility.type || "Facility"}
        </p>

        <p className="mt-3 text-sm font-black text-[#C97B6C]">
          {money(rate)}/hr
        </p>
      </div>
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

function PastSlotLabel() {
  return (
    <span>
      Unavailable
      <br />
      <span className="text-xs font-bold">Past Time</span>
    </span>
  );
}

function MaintenanceSlotLabel({ block }) {
  return (
    <span>
      Maintenance
      <br />
      <span className="text-xs font-bold">Unavailable</span>
      <br />
      <span className="text-xs font-bold">
        {block?.reason || "Facility maintenance"}
      </span>
    </span>
  );
}

function PrivateBlockedSlotLabel({ booking, minutesLeft }) {
  const status = normalizeStatus(booking?.status);
  const paymentStatus = normalizePaymentStatus(booking?.payment_status);

  if (
    status === "reserved" &&
    ["unpaid", "rejected_payment"].includes(paymentStatus)
  ) {
    return (
      <span>
        Reserved
        {minutesLeft !== null && minutesLeft > 0 && (
          <>
            <br />
            <span className="text-xs font-bold">{minutesLeft} min left</span>
          </>
        )}
      </span>
    );
  }

  if (status === "reserved" && paymentStatus === "pending_verification") {
    return (
      <span>
        Payment Review
        <br />
        <span className="text-xs font-bold">Unavailable</span>
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span>
        Payment Review
        <br />
        <span className="text-xs font-bold">Unavailable</span>
      </span>
    );
  }

  if (status === "approved" || paymentStatus === "paid") {
    return (
      <span>
        Booked
        <br />
        <span className="text-xs font-bold">Unavailable</span>
      </span>
    );
  }

  return (
    <span>
      Unavailable
      <br />
      <span className="text-xs font-bold">Not available</span>
    </span>
  );
}

function ConfirmBookingModal({
  selectedGroups,
  bookingDate,
  sessionType,
  notes,
  totalHours,
  totalAmount,
  reservationMinutes,
  submitting,
  onClose,
  onEdit,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Confirm Booking
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              Review your reservation
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              After confirming, your selected slot(s) will be reserved and you will be
              redirected to upload payment proof.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ConfirmItem label="Date" value={formatDate(bookingDate)} />
          <ConfirmItem
            label="Session Type"
            value={
              SESSION_TYPES.find((item) => item.value === sessionType)?.label ||
              sessionType
            }
          />
          <ConfirmItem
            label="Selected Slots"
            value={`${selectedGroups.reduce(
              (sum, group) => sum + group.slots.length,
              0
            )} slot(s)`}
          />
          <ConfirmItem label="Total Hours" value={`${totalHours} hour(s)`} />
          <ConfirmItem
            label="Total Reservation Request"
            value={`${selectedGroups.length} request(s)`}
          />
          <ConfirmItem label="Total Amount" value={money(totalAmount)} />
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-[#2B2B2B]">
            Booking Reservation(s)
          </p>

          <div className="mt-3 space-y-3">
            {selectedGroups.map((group, index) => (
              <div
                key={`${group.facility_id}-${group.start_time}-${group.end_time}-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"
              >
                <div>
                  <p className="font-black text-[#2B2B2B]">
                    Request {index + 1}: {group.facility?.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatTime(group.start_time)} - {formatTime(group.end_time)} •{" "}
                    {group.total_hours} hour(s) • {money(group.rate_per_hour)}/hr
                  </p>
                </div>

                <p className="font-black text-[#C97B6C]">
                  {money(group.total_amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#F5F3F1] px-4 py-4">
          <p className="font-black text-[#2B2B2B]">Final Total</p>

          <p className="text-2xl font-black text-[#C97B6C]">
            {money(totalAmount)}
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-yellow-50 px-4 py-4 text-sm text-yellow-800">
          Your selected slot(s) will be reserved for {reservationMinutes} minute(s).
          Upload your payment proof immediately so staff can verify and approve
          your booking.
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Notes</p>
          <p className="mt-2 text-sm text-slate-600">
            {notes?.trim() || "No notes provided."}
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onEdit}
            disabled={submitting}
            className="rounded-2xl border border-[#DED8D2] px-6 py-3 font-bold hover:bg-[#F5F3F1] disabled:opacity-60"
          >
            Edit Selection
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Confirm and Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmItem({ label, value }) {
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