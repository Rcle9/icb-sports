import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "unpaid").toLowerCase();
}

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ");
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
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getFinalTotal(booking) {
  const totalHours = Number(booking.total_hours || 0);
  const ratePerHour = Number(booking.rate_per_hour || 0);
  const computedTotal = totalHours * ratePerHour;

  return Number(booking.total_amount || 0) || computedTotal;
}

function getFacilityName(booking) {
  return booking?.facilities?.name || "Unknown Facility";
}

function getUserName(booking) {
  return booking?.profiles?.full_name || "Unknown User";
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "reserved") return "bg-blue-100 text-blue-700";
  if (value === "pending") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function paymentStatusClass(status) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "bg-green-100 text-green-700";
  if (value === "pending_verification") return "bg-yellow-100 text-yellow-700";
  if (value === "rejected_payment") return "bg-red-100 text-red-700";
  if (value === "expired") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-700";
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

export default function Reports() {
  const [bookings, setBookings] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayDate());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const facilities = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      if (!booking.facility_id) return;

      map.set(booking.facility_id, {
        id: booking.facility_id,
        name: getFacilityName(booking),
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const paymentStatus = normalizePaymentStatus(booking.payment_status);
      const bookingDate = booking.booking_date || "";

      const matchesDate =
        (!startDate || bookingDate >= startDate) &&
        (!endDate || bookingDate <= endDate);

      const matchesFacility =
        facilityFilter === "all" ||
        String(booking.facility_id) === String(facilityFilter);

      const matchesStatus =
        statusFilter === "all" || status === normalizeStatus(statusFilter);

      const matchesPayment =
        paymentFilter === "all" ||
        paymentStatus === normalizePaymentStatus(paymentFilter);

      const searchText = [
        getFacilityName(booking),
        getUserName(booking),
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.status,
        booking.payment_status,
        booking.payment_method,
        booking.payment_reference,
        booking.session_type,
        booking.id,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return (
        matchesDate &&
        matchesFacility &&
        matchesStatus &&
        matchesPayment &&
        matchesSearch
      );
    });
  }, [
    bookings,
    search,
    facilityFilter,
    paymentFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  const stats = useMemo(() => {
    const paidBookings = filteredBookings.filter(
      (booking) => normalizePaymentStatus(booking.payment_status) === "paid"
    );

    const pendingPayments = filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "pending_verification"
    );

    const rejectedPayments = filteredBookings.filter(
      (booking) =>
        normalizePaymentStatus(booking.payment_status) === "rejected_payment"
    );

    const expiredBookings = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "expired"
    );

    const reservedBookings = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "reserved"
    );

    const approvedBookings = filteredBookings.filter(
      (booking) => normalizeStatus(booking.status) === "approved"
    );

    const revenue = paidBookings.reduce((sum, booking) => {
      return sum + Number(booking.amount_paid || getFinalTotal(booking) || 0);
    }, 0);

    const expectedRevenue = filteredBookings.reduce((sum, booking) => {
      return sum + getFinalTotal(booking);
    }, 0);

    return {
      total: filteredBookings.length,
      paid: paidBookings.length,
      pendingPayments: pendingPayments.length,
      rejectedPayments: rejectedPayments.length,
      expired: expiredBookings.length,
      reserved: reservedBookings.length,
      approved: approvedBookings.length,
      revenue,
      expectedRevenue,
    };
  }, [filteredBookings]);

  const revenueByFacility = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const facilityName = getFacilityName(booking);

      if (!map.has(facilityName)) {
        map.set(facilityName, {
          facility: facilityName,
          totalBookings: 0,
          paidBookings: 0,
          revenue: 0,
          pendingPayments: 0,
          expired: 0,
        });
      }

      const item = map.get(facilityName);

      item.totalBookings += 1;

      if (normalizePaymentStatus(booking.payment_status) === "paid") {
        item.paidBookings += 1;
        item.revenue += Number(booking.amount_paid || getFinalTotal(booking) || 0);
      }

      if (
        normalizePaymentStatus(booking.payment_status) ===
        "pending_verification"
      ) {
        item.pendingPayments += 1;
      }

      if (normalizeStatus(booking.status) === "expired") {
        item.expired += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBookings]);

  const recentPaidTransactions = useMemo(() => {
    return filteredBookings
      .filter(
        (booking) => normalizePaymentStatus(booking.payment_status) === "paid"
      )
      .sort((a, b) => {
        return (
          new Date(b.payment_verified_at || b.updated_at || b.created_at || 0) -
          new Date(a.payment_verified_at || a.updated_at || a.created_at || 0)
        );
      })
      .slice(0, 10);
  }, [filteredBookings]);

  const recentActivity = useMemo(() => {
    return activityLogs.slice(0, 8);
  }, [activityLogs]);

  useEffect(() => {
    loadReports();

    const channel = supabase
      .channel(`admin-reports-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadReports(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
        },
        () => loadActivityLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadReports(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          facilities (*),
          profiles:user_id (
            id,
            full_name,
            role
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
      await loadActivityLogs();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityLogs() {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to load report activity logs:", error.message);
      return;
    }

    setActivityLogs(data || []);
  }

  function resetFilters() {
    setSearch("");
    setFacilityFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setStartDate(getFirstDayOfMonth());
    setEndDate(getTodayDate());
  }

  function exportCsv() {
    const headers = [
      "Booking ID",
      "Customer",
      "Facility",
      "Date",
      "Time",
      "Status",
      "Payment Status",
      "Payment Method",
      "Reference",
      "Total Amount",
      "Amount Paid",
      "Verified At",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.id,
      getUserName(booking),
      getFacilityName(booking),
      booking.booking_date,
      `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`,
      formatLabel(booking.status),
      formatLabel(booking.payment_status),
      booking.payment_method || "-",
      booking.payment_reference || "-",
      getFinalTotal(booking),
      booking.amount_paid || 0,
      formatDateTime(booking.payment_verified_at),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `booking-reports-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Reports" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">Admin Reports Dashboard</p>

                <h2 className="mt-2 text-3xl font-black">
                  Monitor revenue, payments, and reservation performance.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Track paid bookings, pending payment verification, expired
                  reservations, rejected payments, and facility performance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Revenue" value={money(stats.revenue)} />
                <HeroStat label="Paid" value={stats.paid} />
                <HeroStat label="Pending Pay" value={stats.pendingPayments} />
                <HeroStat label="Expired" value={stats.expired} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Bookings" value={stats.total} />
            <StatCard
              title="Approved Bookings"
              value={stats.approved}
              color="#16A34A"
            />
            <StatCard
              title="Reserved Bookings"
              value={stats.reserved}
              color="#2563EB"
            />
            <StatCard
              title="Rejected Payments"
              value={stats.rejectedPayments}
              color="#DC2626"
            />
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
              <FilterInput
                label="Search"
                value={search}
                onChange={setSearch}
                placeholder="Search customer, facility, status, reference"
              />

              <FilterSelect
                label="Facility"
                value={facilityFilter}
                onChange={setFacilityFilter}
                options={[
                  { value: "all", label: "All" },
                  ...facilities.map((facility) => ({
                    value: facility.id,
                    label: facility.name,
                  })),
                ]}
              />

              <FilterSelect
                label="Booking Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "reserved", label: "Reserved" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "expired", label: "Expired" },
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
                  {
                    value: "pending_verification",
                    label: "Pending Verification",
                  },
                  { value: "paid", label: "Paid" },
                  { value: "rejected_payment", label: "Rejected Payment" },
                  { value: "expired", label: "Expired" },
                ]}
              />

              <DateInput label="Start Date" value={startDate} onChange={setStartDate} />
              <DateInput label="End Date" value={endDate} onChange={setEndDate} />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="w-full rounded-2xl bg-[#C97B6C] px-5 py-3 font-bold text-white hover:bg-[#B87463]"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Loading reports...</p>
            </section>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Revenue by Facility
                  </h3>

                  <p className="text-sm text-slate-500">
                    Summary based on paid bookings in the selected date range.
                  </p>

                  {revenueByFacility.length === 0 ? (
                    <p className="mt-6 text-sm text-slate-500">
                      No facility revenue data found.
                    </p>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {revenueByFacility.map((item) => (
                        <FacilityRevenueCard key={item.facility} item={item} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    Report Summary
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Quick overview of your current filter.
                  </p>

                  <div className="mt-5 space-y-3">
                    <SummaryRow
                      label="Collected Revenue"
                      value={money(stats.revenue)}
                    />
                    <SummaryRow
                      label="Expected Revenue"
                      value={money(stats.expectedRevenue)}
                    />
                    <SummaryRow label="Paid Bookings" value={stats.paid} />
                    <SummaryRow
                      label="Payment Review"
                      value={stats.pendingPayments}
                    />
                    <SummaryRow
                      label="Expired Reservations"
                      value={stats.expired}
                    />
                    <SummaryRow
                      label="Rejected Payments"
                      value={stats.rejectedPayments}
                    />
                  </div>
                </div>
              </section>

              <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Recent Paid Transactions
                </h3>

                <p className="text-sm text-slate-500">
                  Latest verified payments and approved paid bookings.
                </p>

                {recentPaidTransactions.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">
                    No paid transactions found.
                  </p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {recentPaidTransactions.map((booking) => (
                      <TransactionCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-[#2B2B2B]">
                      Booking Report List
                    </h3>

                    <p className="text-sm text-slate-500">
                      Full booking and payment report based on your selected filters.
                    </p>
                  </div>

                  <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                    {filteredBookings.length} shown
                  </span>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                    No booking report records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DED8D2]">
                    <table className="w-full min-w-[1100px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-[#2B2B2B]">
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Customer
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Facility
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Date & Time
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Status
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Payment
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Total
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Paid
                          </th>
                          <th className="border border-[#DED8D2] px-4 py-3">
                            Reference
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-[#FFF8F5]">
                            <td className="border border-[#DED8D2] px-4 py-3 font-bold text-[#2B2B2B]">
                              {getUserName(booking)}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              {getFacilityName(booking)}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              {formatDate(booking.booking_date)}
                              <br />
                              <span className="text-xs text-slate-500">
                                {formatTime(booking.start_time)} -{" "}
                                {formatTime(booking.end_time)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                                  booking.status
                                )}`}
                              >
                                {formatLabel(booking.status)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${paymentStatusClass(
                                  booking.payment_status
                                )}`}
                              >
                                {formatLabel(booking.payment_status)}
                              </span>
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black">
                              {money(getFinalTotal(booking))}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3 font-black text-green-700">
                              {money(booking.amount_paid)}
                            </td>

                            <td className="border border-[#DED8D2] px-4 py-3">
                              {booking.payment_reference || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Recent System Activity
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Latest booking and payment actions recorded in activity logs.
                </p>

                {recentActivity.length === 0 ? (
                  <p className="mt-5 text-sm text-slate-500">
                    No recent activity logs found.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recentActivity.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-[#DED8D2] px-4 py-3"
                      >
                        <p className="font-black text-[#2B2B2B]">
                          {formatLabel(log.action || log.action_type)}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {log.description}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      />
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

function DateInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      />
    </div>
  );
}

function StatCard({ title, value, color = "#2B2B2B" }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>

      <h3 className="mt-3 text-3xl font-black" style={{ color }}>
        {value}
      </h3>
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

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <b className="text-[#2B2B2B]">{value}</b>
    </div>
  );
}

function FacilityRevenueCard({ item }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-black text-[#2B2B2B]">{item.facility}</h4>

          <p className="mt-1 text-sm text-slate-500">
            {item.totalBookings} booking(s), {item.paidBookings} paid
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-2xl font-black text-[#C97B6C]">
            {money(item.revenue)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {item.pendingPayments} payment review • {item.expired} expired
          </p>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ booking }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-lg font-black text-[#2B2B2B]">
            {getFacilityName(booking)}
          </h4>

          <p className="mt-1 text-sm text-slate-600">
            Customer: <b>{getUserName(booking)}</b>
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
            {formatTime(booking.end_time)}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Reference: <b>{booking.payment_reference || "-"}</b>
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-2xl font-black text-green-700">
            {money(booking.amount_paid || getFinalTotal(booking))}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Verified: {formatDateTime(booking.payment_verified_at)}
          </p>
        </div>
      </div>
    </div>
  );
}