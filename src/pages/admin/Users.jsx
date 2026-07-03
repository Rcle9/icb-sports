import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { supabase } from "../../services/supabaseClient";
import { createActivityLog } from "../../services/activityLogService";

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfiles();

    const channel = supabase
      .channel(`admin-users-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchProfiles(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchProfiles(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
    } catch (err) {
      console.error("Fetch profiles error:", err.message);
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  function getAllowedRoleValue(role) {
    const cleanRole = String(role || "user").toLowerCase();

    if (cleanRole === "staff") return "staff";
    if (cleanRole === "admin") return "admin";

    return "user";
  }

  function getRoleDisplay(role) {
    return getAllowedRoleValue(role);
  }

  function getRoleBadgeClass(role) {
    const cleanRole = getAllowedRoleValue(role);

    if (cleanRole === "admin") return "bg-purple-100 text-purple-700";
    if (cleanRole === "staff") return "bg-blue-100 text-blue-700";

    return "bg-green-100 text-green-700";
  }

  async function updateRole(profile, newRole) {
    try {
      const cleanRole = getAllowedRoleValue(newRole);
      const oldRole = getAllowedRoleValue(profile.role);

      if (cleanRole === oldRole) return;

      const fullName = profile.full_name || profile.name || "Unnamed User";

      const confirmChange = window.confirm(
        `Change ${fullName}'s role from ${oldRole} to ${cleanRole}?`
      );

      if (!confirmChange) return;

      setUpdatingId(profile.id);
      setError("");
      setMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .update({ role: cleanRole })
        .eq("id", profile.id)
        .select("*")
        .single();

      if (error) throw error;

      await createActivityLog({
        action: "user_role_updated",
        module: "user_management",
        description: `Updated ${fullName}'s role from ${oldRole} to ${cleanRole}.`,
        reference_id: profile.id,
        metadata: {
          user_id: profile.id,
          user_name: fullName,
          previous_role: oldRole,
          new_role: cleanRole,
          created_at: profile.created_at || null,
        },
      });

      setMessage(`Role updated successfully for ${fullName}.`);
      await fetchProfiles(false);

      return data;
    } catch (err) {
      console.error("Update role error:", err.message);
      setError(err.message || "Failed to update user role.");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const fullName = profile.full_name || profile.name || "";
      const role = getRoleDisplay(profile.role);

      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(profile.id).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [profiles, searchTerm, roleFilter]);

  const totalUsers = profiles.filter(
    (profile) => getAllowedRoleValue(profile.role) === "user"
  ).length;

  const totalStaff = profiles.filter(
    (profile) => getAllowedRoleValue(profile.role) === "staff"
  ).length;

  const totalAdmins = profiles.filter(
    (profile) => getAllowedRoleValue(profile.role) === "admin"
  ).length;

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="User Management" />

          {message ? (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <section className="mb-6 rounded-[28px] bg-[#C97B6C] p-8 text-white shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold opacity-90">
                  User Administration
                </p>

                <h1 className="mt-3 text-3xl font-black">
                  Manage users, staff, and admin roles.
                </h1>

                <p className="mt-3 max-w-3xl text-sm opacity-90">
                  Search accounts, review roles, update permissions, and record
                  role changes in the admin activity logs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchProfiles()}
                className="rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white hover:bg-white/25"
              >
                Refresh Users
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Total Profiles</p>
              <h2 className="mt-3 text-3xl font-black">{profiles.length}</h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Users</p>
              <h2 className="mt-3 text-3xl font-black text-green-700">
                {totalUsers}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Staff</p>
              <h2 className="mt-3 text-3xl font-black text-blue-700">
                {totalStaff}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-500">Admins</p>
              <h2 className="mt-3 text-3xl font-black text-purple-700">
                {totalAdmins}
              </h2>
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#C97B6C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Role</label>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#C97B6C]"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
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
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Profiles</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredProfiles.length} profile(s).
                </p>
              </div>
            </div>

            {loading ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Loading users...
              </p>
            ) : filteredProfiles.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                No users found.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredProfiles.map((profile) => {
                  const fullName =
                    profile.full_name || profile.name || "Unnamed User";
                  const displayRole = getRoleDisplay(profile.role);
                  const roleValue = getAllowedRoleValue(profile.role);
                  const isUpdating = updatingId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {fullName}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getRoleBadgeClass(
                              displayRole
                            )}`}
                          >
                            {displayRole}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600 capitalize">
                          Current Role: {displayRole}
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

                      <div className="w-full md:w-[190px]">
                        <label className="mb-2 block text-sm font-semibold">
                          Change Role
                        </label>

                        <select
                          value={roleValue}
                          disabled={isUpdating}
                          onChange={(e) => updateRole(profile, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#C97B6C] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>

                        {isUpdating ? (
                          <p className="mt-2 text-xs font-semibold text-[#C97B6C]">
                            Updating role...
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Changes are saved in Activity Logs.
                          </p>
                        )}
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