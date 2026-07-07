// src/services/adminService.js

import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";
import {
  createAdminNotification,
  createUserNotification,
} from "./notificationService";

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatRole(role) {
  const value = normalizeRole(role);

  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";

  return "User";
}

function getRoleDashboardPath(role) {
  const value = normalizeRole(role);

  if (value === "admin") return "/admin/dashboard";
  if (value === "staff") return "/staff/dashboard";

  return "/dashboard";
}

function buildProfileMetadata(profile = {}) {
  return {
    user_id: profile.id || null,
    full_name: profile.full_name || "",
    email: profile.email || "",
    role: profile.role || "user",
    created_at: profile.created_at || null,
    updated_at: profile.updated_at || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Admin service notification error:", error?.message || error);
  }
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getProfileById(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function updateUserRole(userId, newRole, actorId = null) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const finalRole = normalizeRole(newRole);

  const { data: beforeProfile, error: beforeError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (beforeError) throw beforeError;
  if (!beforeProfile) throw new Error("User profile not found.");

  const previousRole = normalizeRole(beforeProfile.role);

  if (previousRole === finalRole) {
    return beforeProfile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: finalRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;

  const metadata = {
    ...buildProfileMetadata(data),
    actor_id: actorId,
    previous_role: previousRole,
    new_role: finalRole,
  };

  await createActivityLog({
    action: "update_user_role",
    module: "users",
    description: `Changed ${data.full_name || data.email || "a user"} role from ${formatRole(
      previousRole
    )} to ${formatRole(finalRole)}.`,
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "profile",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "User Role Updated",
      message: `${data.full_name || data.email || "A user"} is now ${formatRole(
        finalRole
      )}.`,
      type: "user_role_updated",
      referenceId: data.id,
      referenceType: "profiles",
      actionUrl: "/admin/users",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createUserNotification({
      userId: data.id,
      title: "Account Role Updated",
      message: `Your account role was changed from ${formatRole(
        previousRole
      )} to ${formatRole(finalRole)}.`,
      type: "account_role_updated",
      referenceId: data.id,
      referenceType: "profiles",
      actionUrl: getRoleDashboardPath(finalRole),
      metadata,
    });
  });

  return data;
}

export async function updateProfileByAdmin(userId, payload = {}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const cleanPayload = {
    updated_at: new Date().toISOString(),
  };

  if (payload.full_name !== undefined) {
    cleanPayload.full_name = cleanString(payload.full_name);
  }

  if (payload.email !== undefined) {
    cleanPayload.email = cleanString(payload.email);
  }

  if (payload.role !== undefined) {
    cleanPayload.role = normalizeRole(payload.role);
  }

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { data, error } = await supabase
    .from("profiles")
    .update(cleanPayload)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;

  const metadata = buildProfileMetadata(data);

  await createActivityLog({
    action: "update_user_profile",
    module: "users",
    description: `Updated profile for ${data.full_name || data.email || "a user"}.`,
    reference_id: data.id,
    entity_id: data.id,
    entity_type: "profile",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "User Profile Updated",
      message: `${data.full_name || data.email || "A user"} profile was updated.`,
      type: "user_profile_updated",
      referenceId: data.id,
      referenceType: "profiles",
      actionUrl: "/admin/users",
      metadata,
    });
  });

  return data;
}

export async function deleteUserProfile(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const profile = await getProfileById(userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) throw error;

  const metadata = buildProfileMetadata(profile);

  await createActivityLog({
    action: "delete_user_profile",
    module: "users",
    description: `Deleted profile for ${
      profile.full_name || profile.email || "a user"
    }.`,
    reference_id: profile.id,
    entity_id: profile.id,
    entity_type: "profile",
    metadata,
    notifyAdmin: true,
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "User Profile Deleted",
      message: `${profile.full_name || profile.email || "A user"} profile was deleted.`,
      type: "user_profile_deleted",
      referenceId: profile.id,
      referenceType: "profiles",
      actionUrl: "/admin/users",
      metadata,
    });
  });

  return true;
}

export async function searchProfiles(searchTerm = "") {
  const search = cleanString(searchTerm);

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  if (!search) return data || [];

  const lowerSearch = search.toLowerCase();

  return (data || []).filter((profile) => {
    return (
      String(profile.full_name || "").toLowerCase().includes(lowerSearch) ||
      String(profile.email || "").toLowerCase().includes(lowerSearch) ||
      String(profile.role || "").toLowerCase().includes(lowerSearch)
    );
  });
}

export async function getUserCountsByRole() {
  const profiles = await getAllProfiles();

  return profiles.reduce(
    (counts, profile) => {
      const role = normalizeRole(profile.role);

      counts.total += 1;
      counts[role] += 1;

      return counts;
    },
    {
      total: 0,
      user: 0,
      staff: 0,
      admin: 0,
    }
  );
}

export function formatUserRole(role) {
  return formatRole(role);
}

export function getUserRoleClass(role) {
  const value = normalizeRole(role);

  if (value === "admin") return "bg-red-100 text-red-700";
  if (value === "staff") return "bg-blue-100 text-blue-700";

  return "bg-green-100 text-green-700";
}