import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function normalizeRole(role) {
  const cleanRole = String(role || "staff").toLowerCase();

  if (cleanRole === "admin") return "admin";
  if (cleanRole === "staff") return "staff";

  return "staff";
}

function getRoleFromPath(pathname, profileRole) {
  if (pathname.startsWith("/admin")) return "admin";
  return normalizeRole(profileRole);
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function getLogAction(log) {
  return log?.action || log?.action_type || "system_event";
}

function actionClass(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("created")) return "bg-blue-100 text-blue-700";
  if (value.includes("uploaded")) return "bg-yellow-100 text-yellow-700";
  if (value.includes("verified")) return "bg-green-100 text-green-700";
  if (value.includes("rejected")) return "bg-red-100 text-red-700";
  if (value.includes("expired")) return "bg-orange-100 text-orange-700";
  if (value.includes("cancelled")) return "bg-slate-200 text-slate-700";

  return "bg-purple-100 text-purple-700";
}

function moduleClass(module) {
  const value = String(module || "").toLowerCase();

  if (value === "payments") return "bg-yellow-100 text-yellow-700";
  if (value === "bookings") return "bg-blue-100 text-blue-700";
  if (value === "coaching") return "bg-purple-100 text-purple-700";
  if (value === "inventory") return "bg-green-100 text-green-700";
  if (value === "maintenance") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

function getActorName(log) {
  return (
    log?.profiles?.full_name ||
    log?.metadata?.customer_name ||
    log?.metadata?.staff_name ||
    log?.role ||
    "System"
  );
}

function getReferenceText(log) {
  return (
    log?.metadata?.booking_id ||
    log?.metadata?.reference_id ||
    log?.reference_id ||
    "-"
  );
}

export default function ActivityLogs() {
  const { profile } = useAuth();
  const location = useLocation();

  const role = getRoleFromPath(location.pathname, profile?.role);

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: logs.length,
      bookings: logs.filter(
        (log) => String(log.module).toLowerCase() === "bookings"
      ).length,
      payments: logs.filter(
        (log) => String(log.module).toLowerCase() === "payments"
      ).length,
      system: logs.filter(
        (log) => String(log.role).toLowerCase() === "system"
      ).length,
    };
  }, [logs]);

  const uniqueActions = useMemo(() => {
    return [...new Set(logs.map((log) => getLogAction(log)).filter(Boolean))].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const module = String(log.module || "").toLowerCase();
      const action = String(getLogAction(log) || "").toLowerCase();
      const logRole = String(log.role || "").toLowerCase();

      const matchesModule =
        moduleFilter === "all" || module === moduleFilter.toLowerCase();

      const matchesAction =
        actionFilter === "all" || action === actionFilter.toLowerCase();

      const matchesRole =
        roleFilter === "all" || logRole === roleFilter.toLowerCase();

      const matchesDate =
        dateFilter === "" ||
        String(log.created_at || "").slice(0, 10) === dateFilter;

      const searchText = [
        getLogAction(log),
        log.description,
        log.module,
        log.role,
        log.reference_id,
        log.created_at,
        log.profiles?.full_name,
        JSON.stringify(log.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchText.includes(search.toLowerCase());

      return (
        matchesModule &&
        matchesAction &&
        matchesRole &&
        matchesDate &&
        matchesSearch
      );
    });
  }, [logs, search, moduleFilter, actionFilter, roleFilter, dateFilter]);

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel(`activity-logs-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          loadLogs(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadLogs(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setModuleFilter("all");
    setActionFilter("all");
    setRoleFilter("all");
    setDateFilter("");
  }

  function exportCsv() {
    const headers = [
      "Date/Time",
      "Actor",
      "Role",
      "Module",
      "Action",
      "Description",
      "Reference ID",
    ];

    const rows = filteredLogs.map((log) => [
      formatDateTime(log.created_at),
      getActorName(log),
      log.role || "-",
      log.module || "-",
      getLogAction(log),
      log.description || "-",
      getReferenceText(log),
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
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar role={role} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Activity Logs" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">System Monitoring</p>

                <h2 className="mt-2 text-3xl font-black">
                  Track booking and payment activities.
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  This page records reservations, payment uploads, staff
                  verification, rejected payments, cancellations, and expired
                  bookings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroStat label="Total" value={stats.total} />
                <HeroStat label="Bookings" value={stats.bookings} />
                <HeroStat label="Payments" value={stats.payments} />
                <HeroStat label="System" value={stats.system} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search Logs
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search actor, action, description, reference ID, or metadata"
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <FilterSelect
                label="Module"
                value={moduleFilter}
                onChange={setModuleFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "bookings", label: "Bookings" },
                  { value: "payments", label: "Payments" },
                  { value: "coaching", label: "Coaching" },
                  { value: "inventory", label: "Inventory" },
                  { value: "maintenance", label: "Maintenance" },
                ]}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Action
                </label>

                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {formatLabel(action)}
                    </option>
                  ))}
                </select>
              </div>

              <FilterSelect
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "user", label: "User" },
                  { value: "staff", label: "Staff" },
                  { value: "admin", label: "Admin" },
                  { value: "system", label: "System" },
                ]}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">Date</label>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

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

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Activity Log
                </h3>

                <p className="text-sm text-slate-500">
                  Showing the latest system events and staff operations.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                {filteredLogs.length} shown
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading activity logs...</p>
            ) : filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-6 text-sm text-slate-500">
                No activity logs found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <ActivityLogCard key={log.id} log={log} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ActivityLogCard({ log }) {
  const action = getLogAction(log);

  const metadataEntries = Object.entries(log.metadata || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-5 transition hover:border-[#C97B6C] hover:bg-[#FFF8F5]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${actionClass(
                action
              )}`}
            >
              {formatLabel(action)}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${moduleClass(
                log.module
              )}`}
            >
              {formatLabel(log.module)}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
              {formatLabel(log.role)}
            </span>
          </div>

          <h4 className="text-lg font-black text-[#2B2B2B]">
            {log.description}
          </h4>

          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <MiniDetail label="Actor" value={getActorName(log)} />
            <MiniDetail label="Reference ID" value={getReferenceText(log)} />
            <MiniDetail label="Date" value={formatDate(log.created_at)} />
          </div>

          {metadataEntries.length > 0 && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="mb-3 text-sm font-black text-[#2B2B2B]">
                Metadata
              </p>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {metadataEntries.slice(0, 8).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl bg-white px-3 py-2 text-sm"
                  >
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {formatLabel(key)}
                    </p>

                    <p className="mt-1 break-words font-bold text-[#2B2B2B]">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
          {formatDateTime(log.created_at)}
        </div>
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

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate font-black text-[#2B2B2B]">{value || "-"}</p>
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