import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

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
  if (value === "user") return "bg-yellow-100 text-yellow-700";

  return "bg-slate-100 text-slate-700";
}

function getModuleClass(module) {
  const value = normalize(module);

  if (value.includes("booking")) return "bg-[#F3E4DF] text-[#C97B6C]";
  if (value.includes("payment")) return "bg-green-100 text-green-700";
  if (value.includes("maintenance")) return "bg-purple-100 text-purple-700";
  if (value.includes("inventory")) return "bg-orange-100 text-orange-700";
  if (value.includes("auth")) return "bg-blue-100 text-blue-700";

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
    "Activity recorded."
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

export default function ActivityLogs() {
  const { profile } = useAuth();

  const sidebarRole = normalize(profile?.role) === "admin" ? "admin" : "staff";

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

    return {
      total: logs.length,
      today: todayLogs,
      bookingLogs,
      paymentLogs,
      maintenanceLogs,
    };
  }, [logs]);

  useEffect(() => {
    loadActivityLogs();

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
        .limit(500);

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
    link.download = `incredoball-activity-logs-${dateFrom || "start"}-to-${
      dateTo || "end"
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <Sidebar role={sidebarRole} />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Activity Logs" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold">System Monitoring</p>

                <h2 className="mt-2 text-3xl font-black">
                  Premium Activity Logs
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  Monitor staff actions, booking updates, payment changes, maintenance actions, and system activity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <HeroStat label="Total" value={summary.total} />
                <HeroStat label="Today" value={summary.today} />
                <HeroStat label="Bookings" value={summary.bookingLogs} />
                <HeroStat label="Payments" value={summary.paymentLogs} />
                <HeroStat label="Maintenance" value={summary.maintenanceLogs} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Log Filters
                </h3>

                <p className="text-sm text-slate-500">
                  Search and filter system activities.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadActivityLogs()}
                  className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-sm font-bold hover:bg-[#F5F3F1]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    Refresh
                  </span>
                </button>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-bold text-white hover:bg-[#B87463]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Download size={16} />
                    Export CSV
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
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
                    placeholder="Search actor, action, module, description"
                    className="w-full rounded-2xl border border-[#DED8D2] px-11 py-3 outline-none focus:border-[#C97B6C]"
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
                <label className="mb-2 block text-sm font-semibold">
                  Date From
                </label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Date To
                </label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
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
            </div>
          </section>

          <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Activity Records
                </h3>

                <p className="text-sm text-slate-500">
                  {filteredLogs.length} log(s) shown.
                </p>
              </div>

              <span className="rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-bold text-[#C97B6C]">
                Latest 500 records
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading activity logs...</p>
            ) : filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED8D2] p-8 text-center text-sm text-slate-500">
                No activity logs found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <LogCard key={log.id} log={log} onView={() => openDetails(log)} />
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
      className="w-full rounded-[24px] border border-[#DED8D2] bg-white p-5 text-left shadow-sm transition hover:bg-[#F5F3F1]"
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

          <h3 className="text-lg font-black text-[#2B2B2B]">
            {getLogDescription(log)}
          </h3>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
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

        <div className="shrink-0 rounded-2xl bg-[#F5F3F1] px-4 py-3 text-sm font-black text-[#2B2B2B]">
          View Details
        </div>
      </div>
    </button>
  );
}

function LogDetailsModal({ log, onClose }) {
  const metadataText = getMetadataText(log.metadata);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#C97B6C]">
              Activity Log Details
            </p>

            <h2 className="mt-1 text-2xl font-black text-[#2B2B2B]">
              {formatLabel(getActionType(log))}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(log.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DED8D2] px-4 py-2 font-bold hover:bg-[#F5F3F1]"
          >
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
          <DetailItem label="Action Type" value={formatLabel(getActionType(log))} />
          <DetailItem label="Module" value={formatLabel(getLogModule(log))} />
          <DetailItem label="Entity Type" value={formatLabel(log.entity_type)} />
          <DetailItem label="Reference ID" value={log.reference_id || "-"} />
          <DetailItem label="Entity ID" value={log.entity_id || "-"} />
          <DetailItem label="Created At" value={formatDateTime(log.created_at)} />
          <DetailItem label="Date" value={formatDate(log.created_at)} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-5">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            Description
          </p>

          <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">
            {getLogDescription(log)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#DED8D2] bg-[#111827] p-5">
          <p className="text-sm font-black uppercase tracking-widest text-white/60">
            Metadata
          </p>

          <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs text-white">
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

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-2xl font-black">{value}</h3>
    </div>
  );
}