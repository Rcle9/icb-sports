import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
  updateMaintenanceStatus,
} from "../../services/maintenanceService";

export default function Maintenance() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    request_type: "sport_facility",
    item_name: "",
    issue_description: "",
    priority: "medium",
    replacement_requested: false,
  });

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

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

      setForm({
        request_type: "sport_facility",
        item_name: "",
        issue_description: "",
        priority: "medium",
        replacement_requested: false,
      });

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
      await updateMaintenanceStatus(
        id,
        status,
        user?.id || null,
        replacementRequested
      );
      await load();
    } catch (err) {
      setError(err.message || "Failed to update maintenance status.");
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((item) =>
      `${item.item_name} ${item.issue_description} ${item.priority} ${item.status}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [requests, search]);

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Maintenance" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-600 p-6 text-white md:p-8">
            <div>
              <p className="text-sm font-medium text-orange-100">
                Maintenance Monitoring
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Report and track repair and replacement requests.
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Submit maintenance issues, track progress, and manage repair status from one clean workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card>
              <h2 className="text-2xl font-bold text-black">
                Create Request
              </h2>
              <p className="mt-1 mb-6 text-sm text-black">
                Submit a maintenance or replacement request.
              </p>

              {error ? (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <select
                  name="request_type"
                  value={form.request_type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="sport_facility">Sport Facility</option>
                  <option value="sport_equipment">Sport Equipment</option>
                  <option value="gym_machine">Gym Machine</option>
                </select>

                <input
                  name="item_name"
                  value={form.item_name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Item name"
                />

                <textarea
                  name="issue_description"
                  value={form.issue_description}
                  onChange={handleChange}
                  rows="5"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Describe the issue"
                />

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>

                <label className="flex items-center gap-2 text-sm text-black">
                  <input
                    type="checkbox"
                    name="replacement_requested"
                    checked={form.replacement_requested}
                    onChange={handleChange}
                  />
                  Request replacement if needed
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(234,88,12,0.22)] transition hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </Card>

            <Card className="flex min-h-[500px] flex-col">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Requests</h2>
                  <p className="mt-1 text-sm text-black">
                    Review and update maintenance request statuses.
                  </p>
                </div>

                <input
                  placeholder="Search request..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full lg:w-80 rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              {loading ? (
                <p className="text-black">Loading maintenance requests...</p>
              ) : filteredRequests.length === 0 ? (
                <p className="text-black">No maintenance requests found.</p>
              ) : (
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                  {filteredRequests.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="safe-text text-lg font-semibold">{item.item_name}</p>
                          <p className="safe-text mt-1 text-sm font-medium capitalize">
                            {item.request_type?.replaceAll("_", " ")}
                          </p>
                          <p className="safe-text mt-2 text-sm leading-6">
                            {item.issue_description}
                          </p>
                          <p className="safe-text mt-2 text-sm">
                            Replacement requested: {item.replacement_requested ? "Yes" : "No"}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 xl:items-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              item.priority === "critical"
                                ? "bg-red-100 text-red-700"
                                : item.priority === "high"
                                ? "bg-orange-100 text-orange-700"
                                : item.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.priority}
                          </span>

                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateStatus(
                                item.id,
                                e.target.value,
                                item.replacement_requested
                              )
                            }
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-black"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="replacement_requested">Replacement Requested</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}