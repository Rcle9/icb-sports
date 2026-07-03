import { supabase } from "./supabaseClient";

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
      .select("id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return (
      data || {
        id: user.id,
        full_name: "Authenticated User",
        role: "user",
      }
    );
  } catch (err) {
    console.error("Get actor profile error:", err.message);
    return null;
  }
}

function getOldActionType(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("created")) return "create";
  if (value.includes("updated")) return "update";
  if (value.includes("approved")) return "approve";
  if (value.includes("rejected")) return "reject";
  if (value.includes("cancelled")) return "cancel";
  if (value.includes("deleted")) return "delete";

  return value || "activity";
}

function getOldEntityType(module) {
  const value = String(module || "system").toLowerCase();

  if (value === "user_management") return "user";
  if (value === "bookings") return "booking";

  return value;
}

export async function createActivityLog({
  action,
  module = "system",
  description = "",
  reference_id = null,
  metadata = {},
} = {}) {
  if (!action) {
    console.error("Activity log error: missing action");
    return null;
  }

  try {
    const actor = await getCurrentActorProfile();

    const payload = {
      actor_id: actor?.id || null,
      actor_name: actor?.full_name || "System",
      actor_role: String(actor?.role || "system").toLowerCase(),

      action,
      module,
      description,
      reference_id,
      metadata,

      action_type: getOldActionType(action),
      entity_type: getOldEntityType(module),
      entity_id: reference_id,
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

    console.log("Activity log saved:", data);
    return data;
  } catch (err) {
    console.error("Create activity log error:", err.message);
    return null;
  }
}

export async function getActivityLogs({
  search = "",
  action = "all",
  module = "all",
  limit = 150,
} = {}) {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action !== "all") {
    query = query.eq("action", action);
  }

  if (module !== "all") {
    query = query.eq("module", module);
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
      String(log.entity_id || "").toLowerCase().includes(cleanSearch)
    );
  });
}