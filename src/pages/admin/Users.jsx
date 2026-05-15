import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProfiles(data || []);
    }

    setLoading(false);
  }

  async function updateRole(id, role) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (!error) {
      fetchProfiles();
    }
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const fullName = profile.full_name || profile.name || "";
      const role = profile.role || "";

      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(profile.id).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [profiles, searchTerm, roleFilter]);

  const totalUsers = profiles.filter((p) => p.role === "user").length;
  const totalStaff = profiles.filter((p) => p.role === "staff").length;
  const totalAdmins = profiles.filter((p) => p.role === "admin").length;

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="User Management" />

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] from-[#101827] to-[#2456d6] p-8 text-white shadow-sm">
            <p className="text-sm font-semibold opacity-90">
              User Administration
            </p>
            <h1 className="mt-3 text-3xl font-black">
              Manage users, staff, and admin roles.
            </h1>
            <p className="mt-3 text-sm opacity-90">
              Search accounts, review roles, and update permissions from one
              clean admin view.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Total Profiles</p>
              <h2 className="mt-3 text-3xl font-black">{profiles.length}</h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Users</p>
              <h2 className="mt-3 text-3xl font-black">{totalUsers}</h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Staff</p>
              <h2 className="mt-3 text-3xl font-black">{totalStaff}</h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Admins</p>
              <h2 className="mt-3 text-3xl font-black">{totalAdmins}</h2>
            </Card>
          </section>

          <Card className="mb-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_110px]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name, id, or role"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                 <option value="">All Roles</option>
<option value="user">User</option>
<option value="staff">Staff</option>
<option value="coach">Coach</option>
<option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-5 text-2xl font-black">Profiles</h2>

            {loading ? (
              <p className="text-slate-500">Loading users...</p>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-slate-500">No users found.</p>
            ) : (
              <div className="space-y-4">
                {filteredProfiles.map((profile) => {
                  const fullName =
                    profile.full_name || profile.name || "Unnamed User";

                  return (
                    <div
                      key={profile.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">
                          {fullName}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600 capitalize">
                          Current Role: {profile.role || "user"}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">
                          User ID: {profile.id}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Created:{" "}
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>

                      <div className="w-full md:w-[170px]">
                        <label className="mb-2 block text-sm font-semibold">
                          Change Role
                        </label>
                        <select
                          value={profile.role || "user"}
                          onChange={(e) =>
                            updateRole(profile.id, e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                        >
                          <option value="user">User</option>
<option value="staff">Staff</option>
<option value="coach">Coach</option>
<option value="admin">Admin</option>
                        </select>
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