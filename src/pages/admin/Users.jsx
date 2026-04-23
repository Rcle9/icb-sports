import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { getAllProfiles, updateUserRole } from "../../services/adminService";

export default function Users() {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      setError("");
      const data = await getAllProfiles();
      setProfiles(data || []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      setActionLoadingId(userId);
      setError("");
      await updateUserRole(userId, newRole, user?.id || null);
      await loadProfiles();
    } catch (err) {
      setError(err.message || "Failed to update role.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const summary = useMemo(() => {
    return {
      total: profiles.length,
      users: profiles.filter((p) => p.role === "user").length,
      staff: profiles.filter((p) => p.role === "staff").length,
      admins: profiles.filter((p) => p.role === "admin").length,
    };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesRole =
        roleFilter === "all" ? true : profile.role === roleFilter;

      const searchSource =
        `${profile.full_name || ""} ${profile.id || ""} ${profile.role || ""}`
          .toLowerCase();

      const matchesSearch = searchTerm
        ? searchSource.includes(searchTerm.toLowerCase())
        : true;

      return matchesRole && matchesSearch;
    });
  }, [profiles, roleFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="User Management" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] md:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                User Administration
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Manage users, staff, and admin roles.
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Search accounts, review roles, and update permissions from one clean admin view.
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-black">Total Profiles</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.total}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Users</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.users}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Staff</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.staff}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-black">Admins</p>
              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : summary.admins}
              </h2>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-black">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name, id, or role"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="w-full lg:w-56">
                <label className="mb-2 block text-sm font-medium text-black">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-grey outline-none transition focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-black transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-2xl font-bold text-black">Profiles</h2>

            {error ? (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="text-black">Loading users...</p>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-black">No users found.</p>
            ) : (
              <div className="space-y-4">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-semibold text-black">
                          {profile.full_name || "No Name"}
                        </p>
                        <p className="mt-1 text-sm text-black capitalize">
                          Current role: {profile.role}
                        </p>
                        <p className="mt-2 break-all text-xs text-slate-700">
                          User ID: {profile.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          Created:{" "}
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <label className="mb-2 block text-sm font-medium text-black">
                          Change Role
                        </label>
                        <select
                          value={profile.role}
                          disabled={actionLoadingId === profile.id}
                          onChange={(e) =>
                            handleRoleChange(profile.id, e.target.value)
                          }
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-grey outline-none transition focus:border-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}