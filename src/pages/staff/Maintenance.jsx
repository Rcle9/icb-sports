// src/pages/staff/Maintenance.jsx

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../context/AuthContext";
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
  updateMaintenanceStatus,
} from "../../services/maintenanceService";

function formatStatusLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function normalizeStatus(value) {
  return String(value || "pending").toLowerCase();
}

function normalizePriority(value) {
  return String(value || "medium").toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getPriorityClass(priority) {
  const value = normalizePriority(priority);

  if (value === "critical") return "bg-red-100 text-red-700";
  if (value === "high") return "bg-orange-100 text-orange-700";
  if (value === "medium") return "bg-amber-100 text-amber-700";
  if (value === "low") return "bg-green-100 text-green-700";

  return "bg-slate-100 text-slate-700";
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "in_progress") return "bg-blue-100 text-blue-700";
  if (value === "replacement_requested") return "bg-purple-100 text-purple-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

export default function Maintenance() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] = useState({
    request_type: "sport_facility",
    item_name: "",
    issue_description: "",
    priority: "medium",
    replacement_requested: false,
  });

  const requestTypes = useMemo(() => {
    const values = requests
      .map((item) => String(item.request_type || "").trim())
      .filter(Boolean);

    return ["all", ...new Set(values)];
  }, [requests]);

  const summary = useMemo(() => {
    const pending = requests.filter(
      (item) => normalizeStatus(item.status) === "pending"
    ).length;

    const inProgress = requests.filter(
      (item) => normalizeStatus(item.status) === "in_progress"
    ).length;

    const completed = requests.filter(
      (item) => normalizeStatus(item.status) === "completed"
    ).length;

    const replacementRequested = requests.filter(
      (item) =>
        normalizeStatus(item.status) === "replacement_requested" ||
        item.replacement_requested
    ).length;

    const critical = requests.filter(
      (item) => normalizePriority(item.priority) === "critical"
    ).length;

    return {
      total: requests.length,
      pending,
      inProgress,
      completed,
      replacementRequested,
      critical,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const text = [
        item.item_name,
        item.issue_description,
        item.priority,
        item.status,
        item.request_type,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || normalizeStatus(item.status) === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        normalizePriority(item.priority) === priorityFilter;

      const matchesType =
        typeFilter === "all" ||
        String(item.request_type || "").toLowerCase() ===
          String(typeFilter).toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [requests, search, statusFilter, priorityFilter, typeFilter]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const data = await getMaintenanceRequests();

      setRequests(data || []);
    } catch (err) {
      setError(err.message || "Failed to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm({
      request_type: "sport_facility",
      item_name: "",
      issue_description: "",
      priority: "medium",
      replacement_requested: false,
    });
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.item_name.trim() || !form.issue_description.trim()) {
      setError("Item name and issue description are required.");
      return;
    }

    try {
      setSaving(true);

      await createMaintenanceRequest({
        request_type: form.request_type,
        item_name: form.item_name.trim(),
        issue_description: form.issue_description.trim(),
        priority: form.priority,
        replacement_requested: form.replacement_requested,
        requested_by: user?.id || null,
        status: "pending",
      });

      resetForm();

      setMessage("Maintenance request submitted successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to submit maintenance request.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status, replacementRequested = false) {
    try {
      setError("");
      setMessage("");
      setUpdatingId(id);

      await updateMaintenanceStatus(
        id,
        status,
        user?.id || null,
        replacementRequested
      );

      setMessage("Maintenance status updated successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to update maintenance status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="staff"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Maintenance"
            subtitle="Report, track, and update facility maintenance requests."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Maintenance Monitoring
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Report and track repair requests clearly.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Submit facility issues, monitor repair progress, flag
                  replacements, and keep sports center operations safe and
                  organized.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                <HeroStat label="Total" value={summary.total} />
                <HeroStat label="Pending" value={summary.pending} />
                <HeroStat label="In Progress" value={summary.inProgress} />
                <HeroStat label="Completed" value={summary.completed} />
                <HeroStat label="Critical" value={summary.critical} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total Requests"
              value={summary.total}
              description="All maintenance records"
              icon={<ClipboardList size={22} />}
              tone="coral"
            />

            <MetricCard
              title="Pending"
              value={summary.pending}
              description="Waiting for action"
              icon={<Clock size={22} />}
              tone="amber"
            />

            <MetricCard
              title="In Progress"
              value={summary.inProgress}
              description="Currently handled"
              icon={<Wrench size={22} />}
              tone="blue"
            />

            <MetricCard
              title="Replacement"
              value={summary.replacementRequested}
              description="Replacement needed"
              icon={<ShieldAlert size={22} />}
              tone="purple"
            />

            <MetricCard
              title="Completed"
              value={summary.completed}
              description="Resolved requests"
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6">
                <p className="icb-eyebrow">Create Request</p>

                <h3 className="icb-section-title mt-2">
                  New Maintenance Request
                </h3>

                <p className="icb-section-subtitle">
                  Submit facility, equipment, or gym machine concerns.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="icb-label">Request Type</label>

                  <select
                    name="request_type"
                    value={form.request_type}
                    onChange={handleChange}
                    className="icb-select"
                  >
                    <option value="sport_facility">Sport Facility</option>
                    <option value="sport_equipment">Sport Equipment</option>
                    <option value="gym_machine">Gym Machine</option>
                  </select>
                </div>

                <FormInput
                  label="Item Name"
                  name="item_name"
                  value={form.item_name}
                  onChange={handleChange}
                  placeholder="Example: Pickleball Court 1"
                />

                <div>
                  <label className="icb-label">Issue Description</label>

                  <textarea
                    name="issue_description"
                    value={form.issue_description}
                    onChange={handleChange}
                    rows="5"
                    className="icb-textarea"
                    placeholder="Describe the issue clearly"
                  />
                </div>

                <div>
                  <label className="icb-label">Priority</label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="icb-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] px-4 py-4 text-sm font-bold text-[#0B1F33] transition hover:border-[#C97B6C]/50">
                  <input
                    type="checkbox"
                    name="replacement_requested"
                    checked={form.replacement_requested}
                    onChange={handleChange}
                    className="h-4 w-4 accent-[#C97B6C]"
                  />
                  Request replacement if needed
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving}
                    className="icb-btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Wrench size={17} />
                    {saving ? "Submitting..." : "Submit Request"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="icb-btn-light"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </section>

            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="icb-eyebrow">Maintenance List</p>

                  <h3 className="icb-section-title mt-2">Requests</h3>

                  <p className="icb-section-subtitle">
                    {filteredRequests.length} of {requests.length} request
                    {requests.length === 1 ? "" : "s"} shown.
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
                    className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={17}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                  <label className="icb-label">Search</label>

                  <div className="relative">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      placeholder="Search item, issue, priority, or status"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="icb-input pl-11"
                    />
                  </div>
                </div>

                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "pending", label: "Pending" },
                    { value: "in_progress", label: "In Progress" },
                    {
                      value: "replacement_requested",
                      label: "Replacement Requested",
                    },
                    { value: "completed", label: "Completed" },
                  ]}
                />

                <FilterSelect
                  label="Priority"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: "all", label: "All Priority" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" },
                  ]}
                />

                <FilterSelect
                  label="Type"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={requestTypes.map((type) => ({
                    value: type,
                    label:
                      type === "all"
                        ? "All Types"
                        : formatStatusLabel(type),
                  }))}
                />
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-36 animate-pulse rounded-2xl border border-[#DED8D2] bg-[#FBFAF9]"
                    />
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <EmptyState text="No maintenance requests found." />
              ) : (
                <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
                  {filteredRequests.map((item) => (
                    <MaintenanceCard
                      key={item.id}
                      item={item}
                      updating={updatingId === item.id}
                      onStatusChange={(status) =>
                        updateStatus(
                          item.id,
                          status,
                          item.replacement_requested
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

function MaintenanceCard({ item, updating, onStatusChange }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getPriorityClass(
                item.priority
              )}`}
            >
              {item.priority || "medium"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                item.status
              )}`}
            >
              {formatStatusLabel(item.status)}
            </span>

            {item.replacement_requested && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase text-purple-700">
                Replacement Requested
              </span>
            )}
          </div>

          <h4 className="safe-text text-xl font-black text-[#0B1F33]">
            {item.item_name}
          </h4>

          <p className="safe-text mt-1 text-sm font-bold capitalize text-slate-500">
            {formatStatusLabel(item.request_type)}
          </p>

          <p className="safe-text mt-3 text-sm font-semibold leading-6 text-slate-600">
            {item.issue_description}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <MiniDetail
              label="Replacement"
              value={item.replacement_requested ? "Yes" : "No"}
            />

            <MiniDetail label="Priority" value={item.priority || "medium"} />

            <MiniDetail
              label="Created"
              value={formatDateTime(item.created_at)}
            />
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[230px]">
          <label className="icb-label">Update Status</label>

          <select
            value={item.status || "pending"}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={updating}
            className="icb-select disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="replacement_requested">
              Replacement Requested
            </option>
            <option value="completed">Completed</option>
          </select>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {updating ? "Updating request..." : "Change status when progress changes."}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="icb-input"
      />
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

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="safe-text mt-1 text-sm font-black capitalize text-[#0B1F33]">
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
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
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