import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";

function downloadCSV(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatTime(time24) {
  if (!time24) return "-";

  const [hourStr, minute] = String(time24).slice(0, 5).split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
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

function formatMonthKey(dateValue) {
  if (!dateValue) return "No Date";

  try {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  } catch {
    return dateValue;
  }
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-700";

  return "bg-yellow-100 text-yellow-700";
}

function getFacilityName(item) {
  return item?.facilities?.name || "Unknown Facility";
}

function getBookingRevenue(item) {
  if (normalizeStatus(item.status) !== "approved") return 0;
  return Number(item.total_amount || 0);
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const [bookingsRes, maintenanceRes, inventoryRes, profilesRes] =
        await Promise.all([
          supabase
            .from("bookings")
            .select(
              `
              *,
              facilities (id, name, type),
              profiles:user_id (id, full_name, role)
            `
            )
            .order("created_at", { ascending: false }),
          supabase.from("maintenance_requests").select("*"),
          supabase.from("inventory").select("*"),
          supabase.from("profiles").select("*"),
        ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setBookings(bookingsRes.data || []);
      setMaintenance(maintenanceRes.data || []);
      setInventory(inventoryRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  function withinDateRange(dateValue) {
    if (!dateValue) return true;

    if (dateFrom && dateValue < dateFrom) return false;
    if (dateTo && dateValue > dateTo) return false;

    return true;
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => withinDateRange(item.booking_date));
  }, [bookings, dateFrom, dateTo]);

  const filteredMaintenance = useMemo(() => {
    return maintenance.filter((item) =>
      withinDateRange(item.created_at?.split("T")[0])
    );
  }, [maintenance, dateFrom, dateTo]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      withinDateRange(item.created_at?.split("T")[0])
    );
  }, [inventory, dateFrom, dateTo]);

  const bookingStats = useMemo(() => {
    const approved = filteredBookings.filter(
      (item) => normalizeStatus(item.status) === "approved"
    );
    const pending = filteredBookings.filter(
      (item) => normalizeStatus(item.status) === "pending"
    );
    const rejected = filteredBookings.filter(
      (item) => normalizeStatus(item.status) === "rejected"
    );
    const cancelled = filteredBookings.filter(
      (item) => normalizeStatus(item.status) === "cancelled"
    );

    const revenue = approved.reduce((sum, item) => {
      return sum + Number(item.total_amount || 0);
    }, 0);

    const totalHours = approved.reduce((sum, item) => {
      return sum + Number(item.total_hours || 0);
    }, 0);

    return {
      total: filteredBookings.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      revenue,
      totalHours,
    };
  }, [filteredBookings]);

  const summary = useMemo(() => {
    return {
      totalUsers: profiles.length,
      totalBookings: filteredBookings.length,
      totalMaintenance: filteredMaintenance.length,
      totalInventoryItems: filteredInventory.length,
      approvedRevenue: bookingStats.revenue,
    };
  }, [
    profiles,
    filteredBookings,
    filteredMaintenance,
    filteredInventory,
    bookingStats,
  ]);

  const monthlyBookingTrend = useMemo(() => {
    const map = {};

    filteredBookings.forEach((booking) => {
      const month = formatMonthKey(booking.booking_date);

      if (!map[month]) {
        map[month] = {
          month,
          total: 0,
          approved: 0,
          pending: 0,
          revenue: 0,
        };
      }

      map[month].total += 1;

      if (normalizeStatus(booking.status) === "approved") {
        map[month].approved += 1;
        map[month].revenue += Number(booking.total_amount || 0);
      }

      if (normalizeStatus(booking.status) === "pending") {
        map[month].pending += 1;
      }
    });

    return Object.values(map).slice(-6);
  }, [filteredBookings]);

  const topFacilities = useMemo(() => {
    const map = {};

    filteredBookings.forEach((booking) => {
      const name = getFacilityName(booking);

      if (!map[name]) {
        map[name] = {
          facility: name,
          total: 0,
          approved: 0,
          revenue: 0,
        };
      }

      map[name].total += 1;

      if (normalizeStatus(booking.status) === "approved") {
        map[name].approved += 1;
        map[name].revenue += Number(booking.total_amount || 0);
      }
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredBookings]);

  const recentApprovedBookings = useMemo(() => {
    return filteredBookings
      .filter((booking) => normalizeStatus(booking.status) === "approved")
      .slice(0, 5);
  }, [filteredBookings]);

  const inventoryStats = useMemo(() => {
    const lowStock = filteredInventory.filter((item) => {
      const quantity = Number(item.quantity || 0);
      const minThreshold = Number(item.min_threshold || 0);
      return minThreshold > 0 && quantity <= minThreshold;
    });

    return {
      total: filteredInventory.length,
      lowStock: lowStock.length,
    };
  }, [filteredInventory]);

  const maintenanceStats = useMemo(() => {
    return {
      total: filteredMaintenance.length,
      pending: filteredMaintenance.filter(
        (item) => normalizeStatus(item.status) === "pending"
      ).length,
      completed: filteredMaintenance.filter(
        (item) => normalizeStatus(item.status) === "completed"
      ).length,
    };
  }, [filteredMaintenance]);

  function exportCurrentTab() {
    if (activeTab === "bookings") {
      downloadCSV(
        "facility-bookings-report.csv",
        filteredBookings.map((item) => ({
          booking_id: item.id,
          requested_by: item.profiles?.full_name || "Unknown User",
          facility: getFacilityName(item),
          date: item.booking_date,
          start_time: item.start_time,
          end_time: item.end_time,
          session_type: item.session_type,
          status: item.status,
          total_hours: item.total_hours || "",
          rate_per_hour: item.rate_per_hour || "",
          total_amount: item.total_amount || "",
          notes: item.notes || "",
          rejection_reason: item.rejection_reason || "",
          cancellation_reason: item.cancellation_reason || "",
        }))
      );
    }

    if (activeTab === "maintenance") {
      downloadCSV(
        "maintenance-report.csv",
        filteredMaintenance.map((item) => ({
          request_type: item.request_type,
          item_name: item.item_name,
          priority: item.priority,
          status: item.status,
          replacement_requested: item.replacement_requested,
          created_at: item.created_at,
        }))
      );
    }

    if (activeTab === "inventory") {
      downloadCSV(
        "inventory-report.csv",
        filteredInventory.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          min_threshold: item.min_threshold,
          status: item.status,
          created_at: item.created_at,
        }))
      );
    }
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Admin Reports" />

          <div className="mb-6 rounded-[28px] bg-[#C97B6C] p-6 text-white md:p-8 print:hidden">
            <p className="text-sm font-medium text-white/80">
              Analytics and Reports
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Review bookings, revenue, inventory, and maintenance data.
            </h2>

            <p className="mt-3 max-w-3xl text-sm text-white/90 md:text-base">
              Filter records by date, export CSV files, and print a clean report
              for presentation or documentation.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 print:hidden">
              {error}
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ReportStatCard title="Users" value={loading ? "..." : summary.totalUsers} />
            <ReportStatCard
              title="Facility Bookings"
              value={loading ? "..." : summary.totalBookings}
            />
            <ReportStatCard
              title="Approved Revenue"
              value={loading ? "..." : money(summary.approvedRevenue)}
              accent="#C97B6C"
            />
            <ReportStatCard
              title="Maintenance"
              value={loading ? "..." : summary.totalMaintenance}
            />
            <ReportStatCard
              title="Inventory Items"
              value={loading ? "..." : summary.totalInventoryItems}
            />
          </div>

          <Card className="mb-6 print:hidden">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Date From
                  </label>

                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Date To
                  </label>

                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-black hover:bg-slate-50"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={exportCurrentTab}
                  className="rounded-2xl bg-[#C97B6C] px-4 py-3 font-semibold text-white hover:bg-[#B96A5D]"
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={printReport}
                  className="rounded-2xl border border-[#C97B6C] bg-white px-4 py-3 font-semibold text-[#C97B6C] hover:bg-[#FFF6F3]"
                >
                  Print Report
                </button>
              </div>
            </div>
          </Card>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Booking Analytics
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Summary of facility usage, approvals, and revenue.
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-500">
                {dateFrom || "Start"} to {dateTo || "Today"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <MiniStat title="Total" value={bookingStats.total} />
              <MiniStat title="Pending" value={bookingStats.pending} color="#D9A441" />
              <MiniStat title="Approved" value={bookingStats.approved} color="#6BAA75" />
              <MiniStat title="Rejected" value={bookingStats.rejected} color="#C65B5B" />
              <MiniStat title="Cancelled" value={bookingStats.cancelled} color="#64748B" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-[#DED8D2] p-5">
                <h4 className="text-lg font-black text-[#2B2B2B]">
                  Monthly Booking Trend
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Total bookings and approved bookings per month.
                </p>

                <div className="mt-5 space-y-4">
                  {monthlyBookingTrend.length === 0 ? (
                    <p className="text-sm text-slate-500">No trend data yet.</p>
                  ) : (
                    monthlyBookingTrend.map((item) => (
                      <TrendBar
                        key={item.month}
                        label={item.month}
                        value={item.total}
                        secondaryValue={item.approved}
                        maxValue={Math.max(
                          ...monthlyBookingTrend.map((row) => row.total),
                          1
                        )}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-[#DED8D2] p-5">
                <h4 className="text-lg font-black text-[#2B2B2B]">
                  Most Booked Facilities
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Facilities ranked by booking count.
                </p>

                <div className="mt-5 space-y-3">
                  {topFacilities.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No facility booking data yet.
                    </p>
                  ) : (
                    topFacilities.map((item, index) => (
                      <div
                        key={item.facility}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-black text-[#2B2B2B]">
                            {index + 1}. {item.facility}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.approved} approved • Revenue {money(item.revenue)}
                          </p>
                        </div>

                        <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#C97B6C]">
                          {item.total}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <Card>
            <div className="mb-6 flex flex-wrap gap-3 overflow-x-auto print:hidden">
              {[
                ["bookings", "Facility Bookings"],
                ["maintenance", "Maintenance"],
                ["inventory", "Inventory"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ${
                    activeTab === key
                      ? "bg-[#C97B6C] text-white"
                      : "bg-slate-100 text-black"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-black">Loading reports...</p>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === "bookings" && (
                  <BookingsTable bookings={filteredBookings} />
                )}

                {activeTab === "maintenance" && (
                  <MaintenanceTable maintenance={filteredMaintenance} />
                )}

                {activeTab === "inventory" && (
                  <InventoryTable inventory={filteredInventory} />
                )}
              </div>
            )}
          </Card>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <h3 className="text-xl font-black text-black">
                Recent Approved Bookings
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest approved reservations in the selected range.
              </p>

              <div className="mt-5 space-y-3">
                {recentApprovedBookings.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No approved bookings found.
                  </p>
                ) : (
                  recentApprovedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <p className="font-black text-black">
                        {getFacilityName(booking)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(booking.booking_date)} •{" "}
                        {formatTime(booking.start_time)} -{" "}
                        {formatTime(booking.end_time)}
                      </p>

                      <p className="mt-2 text-sm font-bold text-[#C97B6C]">
                        {money(booking.total_amount || 0)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-xl font-black text-black">
                Operations Snapshot
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Quick look at maintenance and inventory conditions.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MiniStat title="Maintenance Total" value={maintenanceStats.total} />
                <MiniStat
                  title="Maintenance Pending"
                  value={maintenanceStats.pending}
                  color="#D9A441"
                />
                <MiniStat title="Inventory Items" value={inventoryStats.total} />
                <MiniStat
                  title="Low Stock Items"
                  value={inventoryStats.lowStock}
                  color="#C65B5B"
                />
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

function BookingsTable({ bookings }) {
  return (
    <table className="w-full min-w-[1050px] text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-3 pr-4 text-black">Facility</th>
          <th className="py-3 pr-4 text-black">User</th>
          <th className="py-3 pr-4 text-black">Date</th>
          <th className="py-3 pr-4 text-black">Time</th>
          <th className="py-3 pr-4 text-black">Session Type</th>
          <th className="py-3 pr-4 text-black">Status</th>
          <th className="py-3 pr-4 text-black">Hours</th>
          <th className="py-3 pr-4 text-black">Total</th>
          <th className="py-3 pr-4 text-black">Notes</th>
        </tr>
      </thead>

      <tbody>
        {bookings.length === 0 ? (
          <tr>
            <td colSpan="9" className="py-6 text-center text-slate-500">
              No facility booking records found.
            </td>
          </tr>
        ) : (
          bookings.map((item) => (
            <tr key={item.id} className="border-b align-top">
              <td className="py-4 pr-4 break-words text-black">
                {getFacilityName(item)}
              </td>

              <td className="py-4 pr-4 break-words text-black">
                {item.profiles?.full_name || "Unknown User"}
              </td>

              <td className="py-4 pr-4 text-black">
                {safeText(item.booking_date)}
              </td>

              <td className="py-4 pr-4 text-black">
                {formatTime(item.start_time)} - {formatTime(item.end_time)}
              </td>

              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.session_type)}
              </td>

              <td className="py-4 pr-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                    item.status
                  )}`}
                >
                  {safeText(item.status)}
                </span>
              </td>

              <td className="py-4 pr-4 text-black">
                {safeText(item.total_hours)}
              </td>

              <td className="py-4 pr-4 text-black">
                {money(item.total_amount || 0)}
              </td>

              <td className="py-4 pr-4 break-words text-black">
                {item.notes || "-"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function MaintenanceTable({ maintenance }) {
  return (
    <table className="w-full min-w-[950px] text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-3 pr-4 text-black">Type</th>
          <th className="py-3 pr-4 text-black">Item</th>
          <th className="py-3 pr-4 text-black">Priority</th>
          <th className="py-3 pr-4 text-black">Status</th>
          <th className="py-3 pr-4 text-black">Replacement</th>
          <th className="py-3 pr-4 text-black">Created</th>
        </tr>
      </thead>

      <tbody>
        {maintenance.length === 0 ? (
          <tr>
            <td colSpan="6" className="py-6 text-center text-slate-500">
              No maintenance records found.
            </td>
          </tr>
        ) : (
          maintenance.map((item) => (
            <tr key={item.id} className="border-b align-top">
              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.request_type).replaceAll("_", " ")}
              </td>

              <td className="py-4 pr-4 break-words text-black">
                {safeText(item.item_name)}
              </td>

              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.priority)}
              </td>

              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.status).replaceAll("_", " ")}
              </td>

              <td className="py-4 pr-4 text-black">
                {item.replacement_requested ? "Yes" : "No"}
              </td>

              <td className="py-4 pr-4 text-black">
                {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function InventoryTable({ inventory }) {
  return (
    <table className="w-full min-w-[900px] text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-3 pr-4 text-black">Name</th>
          <th className="py-3 pr-4 text-black">Category</th>
          <th className="py-3 pr-4 text-black">Quantity</th>
          <th className="py-3 pr-4 text-black">Min Threshold</th>
          <th className="py-3 pr-4 text-black">Status</th>
        </tr>
      </thead>

      <tbody>
        {inventory.length === 0 ? (
          <tr>
            <td colSpan="5" className="py-6 text-center text-slate-500">
              No inventory records found.
            </td>
          </tr>
        ) : (
          inventory.map((item) => (
            <tr key={item.id} className="border-b align-top">
              <td className="py-4 pr-4 break-words text-black">
                {safeText(item.name)}
              </td>

              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.category).replaceAll("_", " ")}
              </td>

              <td className="py-4 pr-4 text-black">
                {safeText(item.quantity)}
              </td>

              <td className="py-4 pr-4 text-black">
                {safeText(item.min_threshold)}
              </td>

              <td className="py-4 pr-4 capitalize text-black">
                {safeText(item.status).replaceAll("_", " ")}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ReportStatCard({ title, value, accent = "#2B2B2B" }) {
  return (
    <Card>
      <p className="text-sm text-black">{title}</p>
      <h2 className="mt-2 text-2xl font-bold text-black" style={{ color: accent }}>
        {value}
      </h2>
    </Card>
  );
}

function MiniStat({ title, value, color = "#2B2B2B" }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-black" style={{ color }}>
        {value}
      </h3>
    </div>
  );
}

function TrendBar({ label, value, secondaryValue, maxValue }) {
  const width = Math.max(6, (value / maxValue) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-[#2B2B2B]">{label}</p>
        <p className="text-xs font-semibold text-slate-500">
          {value} total • {secondaryValue} approved
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#C97B6C]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}