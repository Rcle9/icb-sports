// src/pages/admin/Users.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Calendar,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";
import { createActivityLog } from "../../services/activityLogService";

function normalizeRole(role) {
  const cleanRole = String(role || "user").toLowerCase();

  if (cleanRole === "staff") return "staff";
  if (cleanRole === "admin") return "admin";

  return "user";
}

function formatRole(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") return "Admin";
  if (cleanRole === "staff") return "Staff";

  return "User";
}

function getRoleBadgeClass(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") return "bg-purple-100 text-purple-700";
  if (cleanRole === "staff") return "bg-blue-100 text-blue-700";

  return "bg-green-100 text-green-700";
}

function getRoleIcon(role) {
  const cleanRole = normalizeRole(role);

  if (cleanRole === "admin") return <ShieldCheck size={18} />;
  if (cleanRole === "staff") return <BadgeCheck size={18} />;

  return <UserRound size={18} />;
}

function getFullName(profile) {
  return profile?.full_name || profile?.name || "Unnamed User";
}

function getEmail(profile) {
  return profile?.email || profile?.username || "No email recorded";
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
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await fetchProfiles(false);
    } finally {
      setRefreshing(false);
    }
  }

  async function updateRole(profile, newRole) {
    try {
      const cleanRole = normalizeRole(newRole);
      const oldRole = normalizeRole(profile.role);

      if (cleanRole === oldRole) return;

      const fullName = getFullName(profile);

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

  function resetFilters() {
    setSearchTerm("");
    setRoleFilter("all");
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const fullName = getFullName(profile);
      const email = getEmail(profile);
      const role = normalizeRole(profile.role);

      const searchableText = [
        fullName,
        email,
        role,
        profile.id,
        profile.created_at,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchTerm.trim() === "" ||
        searchableText.includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [profiles, searchTerm, roleFilter]);

  const summary = useMemo(() => {
    const totalUsers = profiles.filter(
      (profile) => normalizeRole(profile.role) === "user"
    ).length;

    const totalStaff = profiles.filter(
      (profile) => normalizeRole(profile.role) === "staff"
    ).length;

    const totalAdmins = profiles.filter(
      (profile) => normalizeRole(profile.role) === "admin"
    ).length;

    const recentProfiles = profiles.filter((profile) => {
      if (!profile.created_at) return false;

      const created = new Date(profile.created_at).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      return created >= sevenDaysAgo;
    }).length;

    return {
      total: profiles.length,
      users: totalUsers,
      staff: totalStaff,
      admins: totalAdmins,
      recent: recentProfiles,
      shown: filteredProfiles.length,
    };
  }, [profiles, filteredProfiles.length]);

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
            title="User Management"
            subtitle="Manage users, staff, and administrator roles."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  User Administration
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Manage accounts and access roles clearly.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Search registered profiles, review account details, update
                  user roles, and keep role changes recorded in activity logs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Profiles" value={summary.total} />
                <HeroStat label="Users" value={summary.users} />
                <HeroStat label="Staff" value={summary.staff} />
                <HeroStat label="Admins" value={summary.admins} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total Profiles"
              value={summary.total}
              description="Registered accounts"
              icon={<Users size={22} />}
              tone="coral"
            />

            <MetricCard
              title="Customers"
              value={summary.users}
              description="User role accounts"
              icon={<UserRound size={22} />}
              tone="green"
            />

            <MetricCard
              title="Staff"
              value={summary.staff}
              description="Staff portal accounts"
              icon={<BadgeCheck size={22} />}
              tone="blue"
            />

            <MetricCard
              title="Admins"
              value={summary.admins}
              description="Administrator accounts"
              icon={<ShieldCheck size={22} />}
              tone="purple"
            />

            <MetricCard
              title="Recent"
              value={summary.recent}
              description="Created in last 7 days"
              icon={<Calendar size={22} />}
              tone="amber"
            />
          </section>

          <section className="icb-card mb-6 p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="icb-eyebrow">Account Filters</p>

                <h3 className="icb-section-title mt-2">Search Profiles</h3>

                <p className="icb-section-subtitle">
                  Filter accounts by name, email, user ID, or role.
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
                  {refreshing ? "Refreshing..." : "Refresh Users"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div>
                <label className="icb-label">Search</label>

                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    placeholder="Search by name, email, id, or role"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="icb-input pl-11"
                  />
                </div>
              </div>

              <div>
                <label className="icb-label">Role</label>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="icb-select"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </section>

          <section className="icb-card p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="icb-eyebrow">Profile Records</p>

                <h3 className="icb-section-title mt-2">Accounts</h3>

                <p className="icb-section-subtitle">
                  Showing {filteredProfiles.length} of {profiles.length} profile
                  {profiles.length === 1 ? "" : "s"}.
                </p>
              </div>

              <span className="w-fit rounded-2xl bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#B86658]">
                {summary.shown} shown
              </span>
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
            ) : filteredProfiles.length === 0 ? (
              <EmptyState text="No users found." />
            ) : (
              <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
                {filteredProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    updating={updatingId === profile.id}
                    onRoleChange={(newRole) => updateRole(profile, newRole)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ProfileCard({ profile, updating, onRoleChange }) {
  const fullName = getFullName(profile);
  const email = getEmail(profile);
  const roleValue = normalizeRole(profile.role);
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <article className="rounded-2xl border border-[#DED8D2] bg-white p-5 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] hover:shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C97B6C] text-xl font-black text-white shadow-sm">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="safe-text text-xl font-black text-[#0B1F33]">
                {fullName}
              </h4>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${getRoleBadgeClass(
                  roleValue
                )}`}
              >
                {getRoleIcon(roleValue)}
                {formatRole(roleValue)}
              </span>
            </div>

            <p className="safe-text mt-2 text-sm font-semibold text-slate-600">
              {email}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MiniDetail label="Current Role" value={formatRole(roleValue)} />

              <MiniDetail label="Created" value={formatDate(profile.created_at)} />

              <MiniDetail label="Updated" value={formatDate(profile.updated_at)} />
            </div>

            <div className="mt-4 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                User ID
              </p>

              <p className="safe-text mt-1 break-all text-xs font-bold text-[#0B1F33]">
                {profile.id}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[240px]">
          <label className="icb-label">Change Role</label>

          <select
            value={roleValue}
            disabled={updating}
            onChange={(event) => onRoleChange(event.target.value)}
            className="icb-select disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Activity size={14} />
            {updating
              ? "Updating role..."
              : "Role changes are saved in Activity Logs."}
          </p>
        </div>
      </div>
    </article>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="safe-text mt-1 text-sm font-black text-[#0B1F33]">
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