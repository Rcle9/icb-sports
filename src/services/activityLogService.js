// src/services/activityLogService.js

import { supabase } from "./supabaseClient";
import { createAdminNotification } from "./notificationService";

function normalizeRole(role) {
  const value = String(role || "system").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";
  if (value === "user") return "user";

  return "system";
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeActionType(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("create") || value.includes("add")) return "create";
  if (value.includes("update") || value.includes("edit")) return "update";
  if (value.includes("approve")) return "approve";
  if (value.includes("reject")) return "reject";
  if (value.includes("cancel")) return "cancel";
  if (value.includes("delete") || value.includes("remove")) return "delete";
  if (value.includes("login") || value.includes("sign_in")) return "login";
  if (value.includes("logout") || value.includes("sign_out")) return "logout";
  if (value.includes("payment")) return "payment";
  if (value.includes("complete")) return "complete";

  return value || "activity";
}

function normalizeModule(module) {
  const value = String(module || "system").toLowerCase();

  if (value === "user_management") return "users";
  if (value === "booking") return "bookings";
  if (value === "facility") return "facilities";
  if (value === "product") return "inventory";

  return value || "system";
}

function getEntityType(module) {
  const value = normalizeModule(module);

  if (value === "users") return "user";
  if (value === "bookings") return "booking";
  if (value === "facilities") return "facility";
  if (value === "inventory") return "inventory";
  if (value === "maintenance") return "maintenance";
  if (value === "payment_settings") return "payment_settings";

  return value || "system";
}

function buildLogMetadata(log = {}) {
  return {
    log_id: log.id || null,
    actor_id: log.actor_id || null,
    actor_name: log.actor_name || "System",
    actor_role: log.actor_role || "system",
    action: log.action || null,
    action_type: log.action_type || null,
    module: log.module || null,
    entity_type: log.entity_type || null,
    entity_id: log.entity_id || log.reference_id || null,
    description: log.description || "",
    reference_id: log.reference_id || null,
    created_at: log.created_at || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Activity notification error:", error?.message || error);
  }
}

async function getCurrentActorProfile() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return (
      data || {
        id: user.id,
        full_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Authenticated User",
        email: user.email || "",
        role: "user",
      }
    );
  } catch (err) {
    console.error("Get actor profile error:", err.message);
    return null;
  }
}

export async function createActivityLog({
  action,
  module = "system",
  description = "",
  reference_id = null,
  entity_id = null,
  entity_type = null,
  metadata = {},
  notifyAdmin = false,
} = {}) {
  if (!action) {
    console.error("Activity log error: missing action");
    return null;
  }

  try {
    const actor = await getCurrentActorProfile();
    const finalModule = normalizeModule(module);
    const finalActionType = normalizeActionType(action);
    const finalEntityType = entity_type || getEntityType(finalModule);
    const finalEntityId = entity_id || reference_id || null;

    const payload = {
      actor_id: actor?.id || null,
      actor_name: actor?.full_name || actor?.email || "System",
      actor_role: normalizeRole(actor?.role),

      action: cleanString(action),
      module: finalModule,
      description: cleanString(description),
      reference_id: reference_id || finalEntityId,
      metadata: metadata && typeof metadata === "object" ? metadata : {},

      action_type: finalActionType,
      entity_type: finalEntityType,
      entity_id: finalEntityId,
    };

    const { data, error } = await supabase
      .from("activity_logs")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Create activity log Supabase error:", error);
      throw error;
    }

    if (notifyAdmin) {
      const logMetadata = buildLogMetadata(data);

      await safeNotify(async () => {
        await createAdminNotification({
          title: "System Activity Logged",
          message:
            data.description ||
            `${data.actor_name || "System"} performed ${data.action}.`,
          type: "activity_logged",
          referenceId: data.id,
          referenceType: "activity_logs",
          actionUrl: "/admin/activity-logs",
          metadata: logMetadata,
        });
      });
    }

    return data;
  } catch (err) {
    console.error("Create activity log error:", err.message);
    return null;
  }
}

export async function getActivityLogs({
  search = "",
  action = "all",
  action_type = "all",
  module = "all",
  actor_role = "all",
  entity_type = "all",
  limit = 150,
} = {}) {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number(limit || 150));

  if (action !== "all") {
    query = query.eq("action", action);
  }

  if (action_type !== "all") {
    query = query.eq("action_type", action_type);
  }

  if (module !== "all") {
    query = query.eq("module", normalizeModule(module));
  }

  if (actor_role !== "all") {
    query = query.eq("actor_role", normalizeRole(actor_role));
  }

  if (entity_type !== "all") {
    query = query.eq("entity_type", entity_type);
  }

  const { data, error } = await query;

  if (error) throw error;

  const cleanSearch = String(search || "").toLowerCase().trim();

  if (!cleanSearch) return data || [];

  return (data || []).filter((log) => {
    return (
      String(log.actor_name || "").toLowerCase().includes(cleanSearch) ||
      String(log.actor_role || "").toLowerCase().includes(cleanSearch) ||
      String(log.action || "").toLowerCase().includes(cleanSearch) ||
      String(log.action_type || "").toLowerCase().includes(cleanSearch) ||
      String(log.module || "").toLowerCase().includes(cleanSearch) ||
      String(log.entity_type || "").toLowerCase().includes(cleanSearch) ||
      String(log.description || "").toLowerCase().includes(cleanSearch) ||
      String(log.reference_id || "").toLowerCase().includes(cleanSearch) ||
      String(log.entity_id || "").toLowerCase().includes(cleanSearch) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(cleanSearch)
    );
  });
}

export async function getRecentActivityLogs(limit = 10) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number(limit || 10));

  if (error) throw error;

  return data || [];
}

export async function deleteActivityLog(id) {
  if (!id) {
    throw new Error("Activity log ID is required.");
  }

  const { error } = await supabase.from("activity_logs").delete().eq("id", id);

  if (error) throw error;

  return true;
}

export async function clearActivityLogs() {
  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .not("id", "is", null);

  if (error) throw error;

  return true;
}

export function formatActivityAction(action) {
  return String(action || "Activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getActivityActionClass(actionType) {
  const value = normalizeActionType(actionType);

  if (value === "create") return "bg-green-100 text-green-700";
  if (value === "update") return "bg-blue-100 text-blue-700";
  if (value === "approve") return "bg-emerald-100 text-emerald-700";
  if (value === "reject") return "bg-red-100 text-red-700";
  if (value === "cancel") return "bg-orange-100 text-orange-700";
  if (value === "delete") return "bg-red-100 text-red-700";
  if (value === "payment") return "bg-purple-100 text-purple-700";
  if (value === "login") return "bg-slate-100 text-slate-700";
  if (value === "logout") return "bg-slate-100 text-slate-700";
  if (value === "complete") return "bg-green-100 text-green-700";

  return "bg-[#F3E4DF] text-[#B86658]";
}

export function getActivityRoleClass(role) {
  const value = normalizeRole(role);

  if (value === "admin") return "bg-red-100 text-red-700";
  if (value === "staff") return "bg-blue-100 text-blue-700";
  if (value === "user") return "bg-green-100 text-green-700";

  return "bg-slate-100 text-slate-700";
}