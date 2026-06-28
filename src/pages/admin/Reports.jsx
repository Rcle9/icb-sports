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
}

function formatTime(time24) {
  if (!time24) return "";

  const [hourStr, minute] = String(time24).slice(0, 5).split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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
          supabase.from("bookings").select(`*, facilities (id, name, type)`),
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

  const summary = useMemo(() => {
    return {
      totalUsers: profiles.length,
      totalBookings: filteredBookings.length,
      totalMaintenance: filteredMaintenance.length,
      totalInventoryItems: filteredInventory.length,
    };
  }, [profiles, filteredBookings, filteredMaintenance, filteredInventory]);

  function exportCurrentTab() {
    if (activeTab === "bookings") {
      downloadCSV(
        "facility-bookings-report.csv",
        filteredBookings.map((item) => ({
          facility: item.facilities?.name || "Unknown Facility",
          date: item.booking_date,
          start_time: item.start_time,
          end_time: item.end_time,
          session_type: item.session_type,
          status: item.status,
          total_hours: item.total_hours || "",
          total_amount: item.total_amount || "",
          notes: item.notes || "",
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

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Admin Reports" />

          <div className="mb-6 rounded-[28px] bg-[#C97B6C] p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">
              Analytics and Reports
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Review operations, bookings, inventory, and maintenance data.
            </h2>

            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
              Filter records by date and export clean reports for presentation
              and review.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-black">Users</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.totalUsers}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Facility Bookings</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.totalBookings}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Maintenance Requests</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.totalMaintenance}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Inventory Items</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.totalInventoryItems}
              </h2>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
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

              <div className="flex gap-2">
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
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-6 flex flex-wrap gap-3 overflow-x-auto">
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

            {error ? (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="text-black">Loading reports...</p>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === "bookings" && (
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-3 pr-4 text-black">Facility</th>
                        <th className="py-3 pr-4 text-black">Date</th>
                        <th className="py-3 pr-4 text-black">Time</th>
                        <th className="py-3 pr-4 text-black">Session Type</th>
                        <th className="py-3 pr-4 text-black">Status</th>
                        <th className="py-3 pr-4 text-black">Total</th>
                        <th className="py-3 pr-4 text-black">Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="py-6 text-center text-slate-500"
                          >
                            No facility booking records found.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((item) => (
                          <tr key={item.id} className="border-b align-top">
                            <td className="py-4 pr-4 break-words text-black">
                              {item.facilities?.name || "Unknown"}
                            </td>

                            <td className="py-4 pr-4 text-black">
                              {safeText(item.booking_date)}
                            </td>

                            <td className="py-4 pr-4 text-black">
                              {formatTime(item.start_time)} -{" "}
                              {formatTime(item.end_time)}
                            </td>

                            <td className="py-4 pr-4 capitalize text-black">
                              {safeText(item.session_type)}
                            </td>

                            <td className="py-4 pr-4 capitalize text-black">
                              {safeText(item.status)}
                            </td>

                            <td className="py-4 pr-4 text-black">
                              ₱
                              {Number(
                                item.total_amount || 0
                              ).toLocaleString()}
                            </td>

                            <td className="py-4 pr-4 break-words text-black">
                              {item.notes || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "maintenance" && (
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
                      {filteredMaintenance.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="py-6 text-center text-slate-500"
                          >
                            No maintenance records found.
                          </td>
                        </tr>
                      ) : (
                        filteredMaintenance.map((item) => (
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
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "inventory" && (
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
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="py-6 text-center text-slate-500"
                          >
                            No inventory records found.
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => (
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
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}