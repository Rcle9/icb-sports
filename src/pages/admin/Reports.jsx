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
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [bookings, setBookings] = useState([]);
  const [coachBookings, setCoachBookings] = useState([]);
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

      const [
        bookingsRes,
        coachBookingsRes,
        maintenanceRes,
        inventoryRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from("bookings").select(`
          *,
          facilities (
            id,
            name,
            type
          )
        `),
        supabase.from("coach_bookings").select(`
          *,
          coaches (
            id,
            name,
            specialty
          )
        `),
        supabase.from("maintenance_requests").select("*"),
        supabase.from("inventory").select("*"),
        supabase.from("profiles").select("*"),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (coachBookingsRes.error) throw coachBookingsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setBookings(bookingsRes.data || []);
      setCoachBookings(coachBookingsRes.data || []);
      setMaintenance(maintenanceRes.data || []);
      setInventory(inventoryRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
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

  const filteredCoachBookings = useMemo(() => {
    return coachBookings.filter((item) => withinDateRange(item.booking_date));
  }, [coachBookings, dateFrom, dateTo]);

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
      totalCoachBookings: filteredCoachBookings.length,
      totalMaintenance: filteredMaintenance.length,
      totalInventoryItems: filteredInventory.length,
    };
  }, [
    profiles,
    filteredBookings,
    filteredCoachBookings,
    filteredMaintenance,
    filteredInventory,
  ]);

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
          notes: item.notes || "",
        }))
      );
    }

    if (activeTab === "coaching") {
      downloadCSV(
        "coaching-report.csv",
        filteredCoachBookings.map((item) => ({
          coach: item.coaches?.name || "Unknown Coach",
          date: item.booking_date,
          start_time: item.start_time,
          end_time: item.end_time,
          session_mode: item.session_mode,
          participants: item.participants,
          status: item.status,
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
    <div className="flex min-h-screen bg-[#f5f6f8]">
      <Sidebar role="admin" />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Topbar title="Admin Reports" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <p className="text-gray-500 text-sm">Users</p>
              <h2 className="text-3xl font-bold mt-2">
                {loading ? "..." : summary.totalUsers}
              </h2>
            </Card>

            <Card>
              <p className="text-gray-500 text-sm">Facility Bookings</p>
              <h2 className="text-3xl font-bold mt-2">
                {loading ? "..." : summary.totalBookings}
              </h2>
            </Card>

            <Card>
              <p className="text-gray-500 text-sm">Coach Bookings</p>
              <h2 className="text-3xl font-bold mt-2">
                {loading ? "..." : summary.totalCoachBookings}
              </h2>
            </Card>

            <Card>
              <p className="text-gray-500 text-sm">Maintenance Requests</p>
              <h2 className="text-3xl font-bold mt-2">
                {loading ? "..." : summary.totalMaintenance}
              </h2>
            </Card>

            <Card>
              <p className="text-gray-500 text-sm">Inventory Items</p>
              <h2 className="text-3xl font-bold mt-2">
                {loading ? "..." : summary.totalInventoryItems}
              </h2>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="px-4 py-3 rounded-xl border bg-white hover:bg-gray-50"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={exportCurrentTab}
                  className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setActiveTab("bookings")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  activeTab === "bookings"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Facility Bookings
              </button>

              <button
                onClick={() => setActiveTab("coaching")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  activeTab === "coaching"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Coaching
              </button>

              <button
                onClick={() => setActiveTab("maintenance")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  activeTab === "maintenance"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Maintenance
              </button>

              <button
                onClick={() => setActiveTab("inventory")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  activeTab === "inventory"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Inventory
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="text-gray-500">Loading reports...</p>
            ) : null}

            {!loading && activeTab === "bookings" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-4">Facility</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Time</th>
                      <th className="py-3 pr-4">Session Type</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 pr-4">{item.facilities?.name || "Unknown"}</td>
                        <td className="py-4 pr-4">{item.booking_date}</td>
                        <td className="py-4 pr-4">
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </td>
                        <td className="py-4 pr-4 capitalize">{item.session_type}</td>
                        <td className="py-4 pr-4 capitalize">{item.status}</td>
                        <td className="py-4 pr-4">{item.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && activeTab === "coaching" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-4">Coach</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Time</th>
                      <th className="py-3 pr-4">Mode</th>
                      <th className="py-3 pr-4">Participants</th>
                      <th className="py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoachBookings.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 pr-4">{item.coaches?.name || "Unknown"}</td>
                        <td className="py-4 pr-4">{item.booking_date}</td>
                        <td className="py-4 pr-4">
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </td>
                        <td className="py-4 pr-4 capitalize">
                          {item.session_mode.replaceAll("_", " ")}
                        </td>
                        <td className="py-4 pr-4">{item.participants}</td>
                        <td className="py-4 pr-4 capitalize">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && activeTab === "maintenance" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Item</th>
                      <th className="py-3 pr-4">Priority</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Replacement</th>
                      <th className="py-3 pr-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaintenance.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 pr-4 capitalize">
                          {item.request_type.replaceAll("_", " ")}
                        </td>
                        <td className="py-4 pr-4">{item.item_name}</td>
                        <td className="py-4 pr-4 capitalize">{item.priority}</td>
                        <td className="py-4 pr-4 capitalize">
                          {item.status.replaceAll("_", " ")}
                        </td>
                        <td className="py-4 pr-4">
                          {item.replacement_requested ? "Yes" : "No"}
                        </td>
                        <td className="py-4 pr-4">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && activeTab === "inventory" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-4">Name</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Quantity</th>
                      <th className="py-3 pr-4">Min Threshold</th>
                      <th className="py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 pr-4">{item.name}</td>
                        <td className="py-4 pr-4 capitalize">
                          {item.category.replaceAll("_", " ")}
                        </td>
                        <td className="py-4 pr-4">{item.quantity}</td>
                        <td className="py-4 pr-4">{item.min_threshold}</td>
                        <td className="py-4 pr-4 capitalize">
                          {item.status.replaceAll("_", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}