import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";
import { getActivityLogs } from "../../services/activityLogService";

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString();
}

function normalizeEntityType(type) {
  const cleanType = String(type || "").toLowerCase();

  if (cleanType === "coach" || cleanType === "coaching") return "booking";

  return cleanType;
}

export default function StaffLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("activity-logs-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => loadLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");

      const data = await getActivityLogs();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const entityType = normalizeEntityType(log.entity_type);

      const matchesType =
        typeFilter === "all" ? true : entityType === typeFilter;

      const source = `${log.description} ${log.action_type} ${entityType} ${
        log.actor_role || ""
      }`.toLowerCase();

      const matchesSearch = searchTerm
        ? source.includes(searchTerm.toLowerCase())
        : true;

      return matchesType && matchesSearch;
    });
  }, [logs, typeFilter, searchTerm]);

  return (
    <div className="page-shell">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Activity Logs" />

          <Card className="mb-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">
                  Search
                </label>

                <input
                  type="text"
                  placeholder="Search logs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div className="w-full md:w-56">
                <label className="mb-2 block text-sm font-medium">
                  Entity Type
                </label>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All Types</option>
                  <option value="booking">Booking</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inventory">Inventory</option>
                  <option value="facility">Facility</option>
                  <option value="profile">Profile</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                  className="rounded-xl border bg-white px-4 py-3 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-2xl font-bold text-[#0f172a]">
              Real Activity Logs
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <p className="text-gray-500">Loading activity logs...</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-gray-500">No activity logs found.</p>
            ) : (
              <div
                className="space-y-4 overflow-y-auto pr-2"
                style={{
                  maxHeight: "calc(100vh - 320px)",
                }}
              >
                {filteredLogs.map((log) => {
                  const entityType = normalizeEntityType(log.entity_type);

                  return (
                    <div
                      key={log.id}
                      className="flex flex-col gap-4 rounded-xl border bg-white p-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#0f172a]">
                          {log.description}
                        </p>

                        <p className="mt-1 text-sm capitalize text-gray-600">
                          Action: {log.action_type} • Entity: {entityType}
                        </p>

                        <p className="mt-2 text-xs capitalize text-gray-400">
                          Actor role: {log.actor_role || "unknown"}
                        </p>
                      </div>

                      <div className="text-left md:max-w-[360px] md:text-right">
                        <p className="text-xs text-gray-400">
                          {formatDateTime(log.created_at)}
                        </p>

                        <p className="mt-2 break-all text-xs text-gray-400">
                          Entity ID: {log.entity_id || "-"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}