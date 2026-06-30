import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";
import { createActivityLog } from "./activityLogService";

function cleanText(value) {
  return String(value || "").trim();
}

function formatStatus(status) {
  return String(status || "pending").replaceAll("_", " ");
}

async function safeCreateNotification(payload) {
  try {
    await createNotification({
      user_id: payload.user_id,
      target_role: payload.target_role || null,
      title: payload.title || "Notification",
      message: payload.message || "",
      type: payload.type || "general",
      reference_id: payload.reference_id || null,
      booking_id: payload.booking_id || null,
    });
  } catch (err) {
    console.error("Maintenance notification error:", err.message);
  }
}

async function notifyAdminsAboutMaintenance(request) {
  try {
    const { data: adminProfiles, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (error) throw error;

    if (!adminProfiles?.length) return;

    await Promise.all(
      adminProfiles.map((admin) =>
        safeCreateNotification({
          user_id: admin.id,
          target_role: "admin",
          title: "New Maintenance Request",
          message:
            "A new maintenance request was submitted and may need admin attention.",
          type: "maintenance_admin",
          reference_id: request.id,
        })
      )
    );
  } catch (err) {
    console.error("Notify admins maintenance error:", err.message);
  }
}

async function notifyRequesterAboutMaintenanceUpdate(request, status) {
  if (!request?.requested_by) return;

  await safeCreateNotification({
    user_id: request.requested_by,
    target_role: "staff",
    title: "Maintenance Update",
    message: `Your request is now ${formatStatus(status)}.`,
    type: "maintenance",
    reference_id: request.id,
  });
}

export async function createMaintenanceRequest(payload) {
  const cleanPayload = {
    ...payload,
    status: payload.status || "pending",
    replacement_requested: Boolean(payload.replacement_requested),
  };

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert([cleanPayload])
    .select("*")
    .single();

  if (error) throw error;

  await createActivityLog({
    action: "maintenance_created",
    module: "maintenance",
    description: `Created maintenance request for ${
      data.item_name || data.request_type || "maintenance item"
    }.`,
    reference_id: data.id,
    metadata: {
      maintenance_id: data.id,
      requested_by: data.requested_by || null,
      item_name: data.item_name || "",
      request_type: data.request_type || "",
      priority: data.priority || "",
      status: data.status || "pending",
      replacement_requested: Boolean(data.replacement_requested),
    },
  });

  await notifyAdminsAboutMaintenance(data);

  return data;
}

export async function getMaintenanceRequests() {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getMaintenanceRequestById(requestId) {
  if (!requestId) throw new Error("Missing maintenance request ID.");

  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Maintenance request not found.");

  return data;
}

export async function updateMaintenanceStatus(
  requestId,
  status,
  updatedBy,
  replacementRequested = false
) {
  if (!requestId) throw new Error("Missing maintenance request ID.");
  if (!status) throw new Error("Missing maintenance status.");

  const beforeItem = await getMaintenanceRequestById(requestId);

  const updatePayload = {
    status,
    updated_by: updatedBy || null,
    replacement_requested: Boolean(replacementRequested),
  };

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) throw error;

  await notifyRequesterAboutMaintenanceUpdate(data, status);

  await createActivityLog({
    action:
      status === "completed"
        ? "maintenance_completed"
        : "maintenance_status_updated",
    module: "maintenance",
    description: `Updated maintenance request for ${
      data.item_name || data.request_type || "maintenance item"
    } from ${formatStatus(beforeItem.status)} to ${formatStatus(data.status)}.`,
    reference_id: data.id,
    metadata: {
      maintenance_id: data.id,
      updated_by: updatedBy || null,
      item_name: data.item_name || "",
      request_type: data.request_type || "",
      priority: data.priority || "",
      before_status: beforeItem.status || "",
      after_status: data.status || "",
      before_replacement_requested: Boolean(beforeItem.replacement_requested),
      after_replacement_requested: Boolean(data.replacement_requested),
    },
  });

  return data;
}

export async function updateMaintenanceRequest(requestId, payload = {}) {
  if (!requestId) throw new Error("Missing maintenance request ID.");

  const beforeItem = await getMaintenanceRequestById(requestId);

  const cleanPayload = {
    ...payload,
  };

  if (Object.prototype.hasOwnProperty.call(cleanPayload, "replacement_requested")) {
    cleanPayload.replacement_requested = Boolean(cleanPayload.replacement_requested);
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update(cleanPayload)
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) throw error;

  await createActivityLog({
    action: "maintenance_updated",
    module: "maintenance",
    description: `Updated maintenance request for ${
      data.item_name || data.request_type || "maintenance item"
    }.`,
    reference_id: data.id,
    metadata: {
      maintenance_id: data.id,
      item_name: data.item_name || "",
      request_type: data.request_type || "",
      priority_before: beforeItem.priority || "",
      priority_after: data.priority || "",
      status_before: beforeItem.status || "",
      status_after: data.status || "",
      replacement_requested_before: Boolean(beforeItem.replacement_requested),
      replacement_requested_after: Boolean(data.replacement_requested),
    },
  });

  return data;
}

export async function deleteMaintenanceRequest(requestId) {
  if (!requestId) throw new Error("Missing maintenance request ID.");

  const beforeItem = await getMaintenanceRequestById(requestId);

  const { error } = await supabase
    .from("maintenance_requests")
    .delete()
    .eq("id", requestId);

  if (error) throw error;

  await createActivityLog({
    action: "maintenance_deleted",
    module: "maintenance",
    description: `Deleted maintenance request for ${
      beforeItem.item_name || beforeItem.request_type || "maintenance item"
    }.`,
    reference_id: beforeItem.id,
    metadata: {
      maintenance_id: beforeItem.id,
      requested_by: beforeItem.requested_by || null,
      item_name: beforeItem.item_name || "",
      request_type: beforeItem.request_type || "",
      priority: beforeItem.priority || "",
      status: beforeItem.status || "",
      replacement_requested: Boolean(beforeItem.replacement_requested),
    },
  });

  return true;
}