import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";
import { createActivityLog } from "./activityLogService";

export async function createMaintenanceRequest(payload) {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.requested_by || null,
    actor_role: "staff",
    action_type: "create",
    entity_type: "maintenance",
    entity_id: data.id,
    description: `Created maintenance request for ${data.item_name}`,
    metadata: {
      request_type: data.request_type,
      priority: data.priority,
      status: data.status,
      replacement_requested: data.replacement_requested,
    },
  });

  const { data: adminProfiles, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adminError) throw adminError;

  if (adminProfiles?.length) {
    await Promise.all(
      adminProfiles.map((admin) =>
        createNotification({
          user_id: admin.id,
          title: "New Maintenance Request",
          message:
            "A new maintenance request was submitted and may need admin attention.",
          type: "maintenance_admin",
        })
      )
    );
  }

  return data;
}

export async function getMaintenanceRequests() {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateMaintenanceStatus(
  requestId,
  status,
  updatedBy,
  replacementRequested = false
) {
  const { data: beforeItem, error: beforeError } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update({
      status,
      updated_by: updatedBy,
      replacement_requested: replacementRequested,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw error;

  await createNotification({
    user_id: data.requested_by,
    title: "Maintenance Update",
    message: `Your request is now ${status.replaceAll("_", " ")}.`,
    type: "maintenance",
  });

  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", updatedBy)
    .maybeSingle();

  await createActivityLog({
    actor_id: updatedBy,
    actor_role: actor?.role || "staff",
    action_type: "update",
    entity_type: "maintenance",
    entity_id: data.id,
    description: `Updated maintenance request for ${data.item_name}`,
    metadata: {
      before_status: beforeItem.status,
      after_status: data.status,
      replacement_requested: data.replacement_requested,
    },
  });

  return data;
}