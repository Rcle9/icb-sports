import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { getActivityLogs } from "../../services/activityLogService";
import { supabase } from "../../services/supabaseClient";

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatAction(action) {
  return String(action || "activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionBadge(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("approved")) return "bg-green-100 text-green-700";
  if (value.includes("rejected")) return "bg-red-100 text-red-700";
  if (value.includes("cancelled")) return "bg-slate-200 text-slate-700";
  if (value.includes("created")) return "bg-blue-100 text-blue-700";
  if (value.includes("updated")) return "bg-yellow-100 text-yellow-700";
  if (value.includes("deleted")) return "bg-red-100 text-red-700";
  if (value.includes("auto")) return "bg-orange-100 text-orange-700";
  if (value.includes("alert")) return "bg-orange-100 text-orange-700";

  return "bg-[#F3E4DF] text-[#C97B6C]";
}

function getRoleBadge(role) {
  const value = String(role || "system").toLowerCase();

  if (value === "admin") return "bg-purple-100 text-purple-700";
  if (value === "staff") return "bg-blue-100 text-blue-700";
  if (value === "user") return "bg-green-100 text-green-700";

  return "bg-slate-100 text-slate-700";
}

function getModuleBadge(module) {
  const value = String(module || "system").toLowerCase();

  if (value === "bookings") return "bg-green-100 text-green-700";
  if (value === "maintenance") return "bg-orange-100 text-orange-700";
  if (value === "inventory") return "bg-blue-100 text-blue-700";
  if (value === "user_management") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function normalizeModule(module) {
  const value = String(module || "system").toLowerCase();

  if (value === "booking") return "bookings";
  if (value === "user") return "user_management";

  return value;
}

function getLogAction(log) {
  return log.action || log.action_type || "activity";
}

function getLogModule(log) {
  return normalizeModule(log.module || log.entity_type || "system");
}

function getLogReferenceId(log) {
  return log.reference_id || log.entity_id || "";
}

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel(`admin-activity-logs-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => loadLogs(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [actionFilter, moduleFilter]);

  async function loadLogs(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const data = await getActivityLogs({
        search,
        action: actionFilter,
        module: moduleFilter,
        limit: 200,
      });

      setLogs(data || []);
    } catch (err) {
      console.error("Activity logs error:", err.message);
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const cleanSearch = search.toLowerCase().trim();

    return logs.filter((log) => {
      const action = getLogAction(log);
      const module = getLogModule(log);
      const referenceId = getLogReferenceId(log);

      const matchesSearch =
        !cleanSearch ||
        String(log.actor_name || "").toLowerCase().includes(cleanSearch) ||
        String(log.actor_role || "").toLowerCase().includes(cleanSearch) ||
        String(action || "").toLowerCase().includes(cleanSearch) ||
        String(module || "").toLowerCase().includes(cleanSearch) ||
        String(log.description || "").toLowerCase().includes(cleanSearch) ||
        String(referenceId || "").toLowerCase().includes(cleanSearch);

      const matchesAction =
        actionFilter === "all" || String(action) === actionFilter;

      const matchesModule =
        moduleFilter === "all" || String(module) === moduleFilter;

      return matchesSearch && matchesAction && matchesModule;
    });
  }, [logs, search, actionFilter, moduleFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      booking: filteredLogs.filter((log) => getLogModule(log) === "bookings")
        .length,
      maintenance: filteredLogs.filter(
        (log) => getLogModule(log) === "maintenance"
      ).length,
      inventory: filteredLogs.filter((log) => getLogModule(log) === "inventory")
        .length,
      users: filteredLogs.filter(
        (log) => getLogModule(log) === "user_management"
      ).length,
    };
  }, [filteredLogs]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadLogs();
  }

  function resetFilters() {
    setSearch("");
    setActionFilter("all");
    setModuleFilter("all");
  }

  function exportCSV() {
    if (filteredLogs.length === 0) return;

    const rows = filteredLogs.map((log) => ({
      date: log.created_at,
      actor_name: log.actor_name || "System",
      actor_role: log.actor_role || "system",
      action: getLogAction(log),
      module: getLogModule(log),
      description: log.description || "",
      reference_id: getLogReferenceId(log),
    }));

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
    link.setAttribute("download", "activity-logs-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Activity Logs" />

          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Admin Audit Trail</p>

                <h2 className="mt-3 text-4xl font-black">
                  Monitor important system activities.
                </h2>

                <p className="mt-4 max-w-3xl text-base text-white/90">
                  View booking, maintenance, inventory, and user role activities
                  for accountability and monitoring.
                </p>
              </div>

              <button
                type="button"
                onClick={exportCSV}
                className="rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white hover:bg-white/25"
              >
                Export CSV
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard title="Total Logs" value={stats.total} />
            <StatCard title="Bookings" value={stats.booking} accent="#16a34a" />
            <StatCard
              title="Maintenance"
              value={stats.maintenance}
              accent="#f97316"
            />
            <StatCard title="Inventory" value={stats.inventory} accent="#2563eb" />
            <StatCard title="User Roles" value={stats.users} accent="#7c3aed" />
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-5 shadow-sm">
            <form
              onSubmit={handleSearchSubmit}
              className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px_260px_160px]"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
                  Search Logs
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search actor, role, action, module, or description..."
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
                  Module Filter
                </label>

                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All Modules</option>
                  <option value="bookings">Bookings</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inventory">Inventory</option>
                  <option value="user_management">User Management</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
                  Action Filter
                </label>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 text-sm outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All Actions</option>

                  <option value="booking_created">Booking Created</option>
                  <option value="booking_approved">Booking Approved</option>
                  <option value="booking_rejected">Booking Rejected</option>
                  <option value="booking_cancelled">Booking Cancelled</option>
                  <option value="booking_auto_rejected">
                    Booking Auto Rejected
                  </option>

                  <option value="maintenance_created">
                    Maintenance Created
                  </option>
                  <option value="maintenance_updated">
                    Maintenance Updated
                  </option>
                  <option value="maintenance_status_updated">
                    Maintenance Status Updated
                  </option>
                  <option value="maintenance_completed">
                    Maintenance Completed
                  </option>
                  <option value="maintenance_deleted">
                    Maintenance Deleted
                  </option>

                  <option value="inventory_created">Inventory Created</option>
                  <option value="inventory_updated">Inventory Updated</option>
                  <option value="inventory_stock_updated">
                    Inventory Stock Updated
                  </option>
                  <option value="inventory_stock_alert">
                    Inventory Stock Alert
                  </option>
                  <option value="inventory_deleted">Inventory Deleted</option>

                  <option value="user_role_updated">User Role Updated</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Activity Log Records
                </h3>

                <p className="text-sm text-slate-500">
                  Showing {filteredLogs.length} log record(s).
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadLogs()}
                className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold text-[#2B2B2B] hover:bg-[#F5F3F1]"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Loading activity logs...
              </p>
            ) : filteredLogs.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                No activity logs found.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <LogCard key={log.id} log={log} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, accent = "#2B2B2B" }) {
  return (
    <div className="rounded-[24px] border border-[#DED8D2] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>

      <h3 className="mt-3 text-3xl font-black" style={{ color: accent }}>
        {value}
      </h3>
    </div>
  );
}

function LogCard({ log }) {
  const metadata = log.metadata || {};
  const action = getLogAction(log);
  const module = getLogModule(log);
  const referenceId = getLogReferenceId(log);

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getActionBadge(
                action
              )}`}
            >
              {formatAction(action)}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getRoleBadge(
                log.actor_role
              )}`}
            >
              {log.actor_role || "system"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getModuleBadge(
                module
              )}`}
            >
              {module || "system"}
            </span>
          </div>

          <h4 className="mt-4 text-lg font-black text-[#2B2B2B]">
            {log.description || "System activity recorded."}
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            Actor:{" "}
            <span className="font-bold text-slate-700">
              {log.actor_name || "System"}
            </span>
          </p>

          {referenceId ? (
            <p className="mt-1 break-all text-xs text-slate-400">
              Reference ID: {referenceId}
            </p>
          ) : null}

          {Object.keys(metadata).length > 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">
                Metadata
              </p>

              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-bold capitalize text-slate-600">
                      {key.replaceAll("_", " ")}:
                    </span>{" "}
                    <span className="break-words text-slate-500">
                      {String(value ?? "-")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 rounded-2xl bg-[#F5F3F1] px-4 py-3 text-sm font-bold text-[#2B2B2B]">
          {formatDateTime(log.created_at)}
        </div>
      </div>
    </div>
  );
}