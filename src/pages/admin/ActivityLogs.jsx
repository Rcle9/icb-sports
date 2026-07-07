// src/pages/admin/ActivityLogs.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFirstDayOfMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function getRoleClass(role) {
  const value = normalize(role);

  if (value === "admin") return "bg-purple-100 text-purple-700";
  if (value === "staff") return "bg-blue-100 text-blue-700";
  if (value === "user") return "bg-green-100 text-green-700";

  return "bg-slate-100 text-slate-700";
}

function getModuleClass(module) {
  const value = normalize(module);

  if (value.includes("booking")) return "bg-[#F3E4DF] text-[#B86658]";
  if (value.includes("payment")) return "bg-green-100 text-green-700";
  if (value.includes("maintenance")) return "bg-purple-100 text-purple-700";
  if (value.includes("inventory")) return "bg-orange-100 text-orange-700";
  if (value.includes("user")) return "bg-blue-100 text-blue-700";
  if (value.includes("facility")) return "bg-cyan-100 text-cyan-700";
  if (value.includes("auth")) return "bg-indigo-100 text-indigo-700";

  return "bg-slate-100 text-slate-700";
}

function getActorName(log) {
  return (
    log?.profiles?.full_name ||
    log?.profiles?.name ||
    log?.metadata?.staff_name ||
    log?.metadata?.admin_name ||
    log?.metadata?.user_name ||
    log?.metadata?.actor_name ||
    "System"
  );
}

function getLogDescription(log) {
  return (
    log?.description ||
    log?.metadata?.description ||
    log?.metadata?.message ||
    "System activity recorded."
  );
}

function getLogModule(log) {
  return log?.module || log?.entity_type || "system";
}

function getActionType(log) {
  return log?.action_type || log?.action || "activity";
}

function getMetadataText(metadata) {
  if (!metadata) return "";

  try {
    if (typeof metadata === "string") return metadata;

    return JSON.stringify(metadata, null, 2);
  } catch {
    return "";
  }
}

export default function AdminActivityLogs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [logs, setLogs] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getTodayDate());

  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = useMemo(() => {
    const values = Array.from(
      new Set(logs.map((log) => normalize(log.role)).filter(Boolean))
    );

    return [
      { value: "all", label: "All Roles" },
      ...values.map((value) => ({
        value,
        label: formatLabel(value),
      })),
    ];
  }, [logs]);

  const moduleOptions = useMemo(() => {
    const values = Array.from(
      new Set(logs.map((log) => normalize(getLogModule(log))).filter(Boolean))
    );

    return [
      { value: "all", label: "All Modules" },
      ...values.map((value) => ({
        value,
        label: formatLabel(value),
      })),
    ];
  }, [logs]);

  const actionOptions = useMemo(() => {
    const values = Array.from(
      new Set(logs.map((log) => normalize(getActionType(log))).filter(Boolean))
    );

    return [
      { value: "all", label: "All Actions" },
      ...values.map((value) => ({
        value,
        label: formatLabel(value),
      })),
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const createdDate = log.created_at
        ? new Date(log.created_at).toISOString().split("T")[0]
        : "";

      const role = normalize(log.role);
      const module = normalize(getLogModule(log));
      const action = normalize(getActionType(log));

      const metadataText = getMetadataText(log.metadata);

      const searchableText = [
        getActorName(log),
        getLogDescription(log),
        log.role,
        getLogModule(log),
        getActionType(log),
        log.entity_type,
        log.reference_id,
        log.entity_id,
        metadataText,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchableText.includes(search.toLowerCase());

      const matchesRole = roleFilter === "all" || role === roleFilter;
      const matchesModule = moduleFilter === "all" || module === moduleFilter;
      const matchesAction = actionFilter === "all" || action === actionFilter;

      const matchesDate =
        (!dateFrom || createdDate >= dateFrom) &&
        (!dateTo || createdDate <= dateTo);

      return (
        matchesSearch &&
        matchesRole &&
        matchesModule &&
        matchesAction &&
        matchesDate
      );
    });
  }, [logs, search, roleFilter, moduleFilter, actionFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const today = getTodayDate();

    const todayLogs = logs.filter((log) => {
      if (!log.created_at) return false;

      return new Date(log.created_at).toISOString().split("T")[0] === today;
    }).length;

    const bookingLogs = logs.filter((log) =>
      normalize(getLogModule(log)).includes("booking")
    ).length;

    const paymentLogs = logs.filter((log) =>
      normalize(getLogModule(log)).includes("payment")
    ).length;

    const maintenanceLogs = logs.filter((log) =>
      normalize(getLogModule(log)).includes("maintenance")
    ).length;

    const userLogs = logs.filter((log) =>
      normalize(getLogModule(log)).includes("user")
    ).length;

    return {
      total: logs.length,
      today: todayLogs,
      bookingLogs,
      paymentLogs,
      maintenanceLogs,
      userLogs,
      filtered: filteredLogs.length,
    };
  }, [logs, filteredLogs.length]);

  useEffect(() => {
    loadActivityLogs();

    const channel = supabase
      .channel(`admin-activity-logs-live-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          loadActivityLogs(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadActivityLogs(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .order("created_at", { ascending: false })
        .limit(700);

      if (error) throw error;

      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadActivityLogs(false);
    } finally {
      setRefreshing(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setRoleFilter("all");
    setModuleFilter("all");
    setActionFilter("all");
    setDateFrom(getFirstDayOfMonth());
    setDateTo(getTodayDate());
  }

  function openDetails(log) {
    setSelectedLog(log);
    setDetailsModal(true);
  }

  function closeDetails() {
    setSelectedLog(null);
    setDetailsModal(false);
  }

  function exportCSV() {
    const headers = [
      "Log ID",
      "Actor",
      "Role",
      "Action",
      "Action Type",
      "Module",
      "Entity Type",
      "Reference ID",
      "Entity ID",
      "Description",
      "Created At",
      "Metadata",
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      getActorName(log),
      log.role || "",
      log.action || "",
      getActionType(log),
      getLogModule(log),
      log.entity_type || "",
      log.reference_id || "",
      log.entity_id || "",
      getLogDescription(log),
      log.created_at || "",
      getMetadataText(log.metadata),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `incredoball-admin-activity-logs-${
      dateFrom || "start"
    }-to-${dateTo || "end"}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="admin"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Activity Logs"
            subtitle="Admin audit trail for system actions, role changes, bookings, payments, and updates."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Admin Audit Trail
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Monitor system activity with clear records.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Review user actions, staff updates, role changes, booking
                  activity, payment verification, maintenance events, and system
                  logs in one admin monitoring page.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <HeroStat label="Total" value={summary.total} />
                <HeroStat label="Today" value={summary.today} />
                <HeroStat label="Bookings" value={summary.bookingLogs} />
                <HeroStat label="Payments" value={summary.paymentLogs} />
                <HeroStat label="Users" value={summary.userLogs} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total Logs"
              value={summary.total}
              description="Latest records loaded"
              icon={<Activity size={22} />}
              tone="coral"
            />

            <MetricCard
              title="Today"
              value={summary.today}
              description="Actions recorded today"
              icon={<Calendar size={22} />}
              tone="blue"
            />

            <MetricCard
              title="Bookings"
              value={summary.bookingLogs}
              description="Booking-related actions"
              icon={<ClipboardList size={22} />}
              tone="amber"
            />

            <MetricCard
              title="Payments"
              value={summary.paymentLogs}
              description="Payment-related actions"
              icon={<FileText size={22} />}
              tone="green"
            />

            <MetricCard
              title="Filtered"
              value={summary.filtered}
              description="Currently shown"
              icon={<Search size={22} />}
              tone="slate"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="icb-eyebrow">Log Filters</p>

                <h3 className="icb-section-title mt-2">
                  Search Admin Activity
                </h3>

                <p className="icb-section-subtitle">
                  Filter logs by role, module, action, and date range.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="icb-btn-light"
                >
                  Reset Filters
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="icb-btn-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="icb-btn-accent"
                >
                  <Download size={17} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr]">
              <div>
                <label className="icb-label">Search</label>

                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search actor, action, module, description"
                    className="icb-input pl-11"
                  />
                </div>
              </div>

              <FilterSelect
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={roleOptions}
              />

              <FilterSelect
                label="Module"
                value={moduleFilter}
                onChange={setModuleFilter}
                options={moduleOptions}
              />

              <FilterSelect
                label="Action"
                value={actionFilter}
                onChange={setActionFilter}
                options={actionOptions}
              />

              <div>
                <label className="icb-label">Date From</label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="icb-input"
                />
              </div>

              <div>
                <label className="icb-label">Date To</label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="icb-input"
                />
              </div>
            </div>
          </section>

          <section className="icb-card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Audit Records</p>

                <h3 className="icb-section-title mt-2">System Logs</h3>

                <p className="icb-section-subtitle">
                  {filteredLogs.length} log{filteredLogs.length === 1 ? "" : "s"}{" "}
                  shown from the latest 700 records.
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#B86658]">
                <ShieldCheck size={17} />
                Admin audit view
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-2xl border border-[#DED8D2] bg-[#FBFAF9]"
                  />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState text="No activity logs found." />
            ) : (
              <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
                {filteredLogs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    onView={() => openDetails(log)}
                  />
                ))}
              </div>
            )}
          </section>

          {detailsModal && selectedLog && (
            <LogDetailsModal log={selectedLog} onClose={closeDetails} />
          )}
        </div>
      </main>
    </div>
  );
}

function LogCard({ log, onView }) {
  return (
    <button
      type="button"
      onClick={onView}
      className="w-full rounded-2xl border border-[#DED8D2] bg-white p-5 text-left transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] hover:shadow-sm"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getRoleClass(
                log.role
              )}`}
            >
              {formatLabel(log.role)}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getModuleClass(
                getLogModule(log)
              )}`}
            >
              {formatLabel(getLogModule(log))}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
              {formatLabel(getActionType(log))}
            </span>
          </div>

          <h3 className="safe-text text-lg font-black text-[#0B1F33]">
            {getLogDescription(log)}
          </h3>

          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <User size={16} />
              {getActorName(log)}
            </span>

            <span className="inline-flex items-center gap-2">
              <Calendar size={16} />
              {formatDateTime(log.created_at)}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-2xl bg-[#F3E4DF] px-4 py-3 text-sm font-black text-[#B86658]">
          View Details
        </div>
      </div>
    </button>
  );
}

function LogDetailsModal({ log, onClose }) {
  const metadataText = getMetadataText(log.metadata);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="icb-card max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">Activity Log Details</p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              {formatLabel(getActionType(log))}
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {formatDateTime(log.created_at)}
            </p>
          </div>

          <button type="button" onClick={onClose} className="icb-btn-light">
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getRoleClass(
              log.role
            )}`}
          >
            {formatLabel(log.role)}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getModuleClass(
              getLogModule(log)
            )}`}
          >
            {formatLabel(getLogModule(log))}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
            {formatLabel(getActionType(log))}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailItem label="Actor" value={getActorName(log)} />
          <DetailItem label="Role" value={formatLabel(log.role)} />
          <DetailItem label="Action" value={formatLabel(log.action)} />
          <DetailItem
            label="Action Type"
            value={formatLabel(getActionType(log))}
          />
          <DetailItem label="Module" value={formatLabel(getLogModule(log))} />
          <DetailItem label="Entity Type" value={formatLabel(log.entity_type)} />
          <DetailItem label="Reference ID" value={log.reference_id || "-"} />
          <DetailItem label="Entity ID" value={log.entity_id || "-"} />
          <DetailItem label="Created At" value={formatDateTime(log.created_at)} />
          <DetailItem label="Date" value={formatDate(log.created_at)} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Description
          </p>

          <p className="safe-text mt-2 text-sm font-semibold leading-6 text-[#0B1F33]">
            {getLogDescription(log)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#0B1F33] bg-[#0B1F33] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">
            Metadata
          </p>

          <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-6 text-white">
            {metadataText || "No metadata available."}
          </pre>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="icb-select"
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

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="safe-text mt-2 text-sm font-black text-[#0B1F33]">
        {value || "-"}
      </p>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "coral" }) {
  const toneClasses = {
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="safe-text mt-3 text-3xl font-black text-[#0B1F33]">
            {value}
          </h3>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            toneClasses[tone] || toneClasses.coral
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="safe-text mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}