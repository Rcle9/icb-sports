import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createInventoryItem(payload) {
  const { data, error } = await supabase
    .from("inventory")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.created_by || null,
    actor_role: "staff",
    action_type: "create",
    entity_type: "inventory",
    entity_id: data.id,
    description: `Created inventory item: ${data.name}`,
    metadata: {
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      status: data.status,
    },
  });

  return data;
}

export async function updateInventory(id, payload) {
  const { data: beforeItem, error: beforeError } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) throw beforeError;

  const nextQuantity =
    payload.quantity ?? beforeItem.quantity ?? 0;

  const minThreshold =
    payload.min_threshold ?? beforeItem.min_threshold ?? 5;

  const computedStatus =
    nextQuantity <= 0
      ? "out_of_stock"
      : nextQuantity <= minThreshold
      ? "low_stock"
      : "in_stock";

  const finalPayload = {
    ...payload,
    status: payload.status || computedStatus,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("inventory")
    .update(finalPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const actorId = payload.updated_by || null;

  let actorRole = "staff";
  if (actorId) {
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();

    actorRole = actorProfile?.role || "staff";
  }

  await createActivityLog({
    actor_id: actorId,
    actor_role: actorRole,
    action_type: "update",
    entity_type: "inventory",
    entity_id: data.id,
    description: `Updated inventory item: ${data.name}`,
    metadata: {
      before_quantity: beforeItem.quantity,
      after_quantity: data.quantity,
      before_status: beforeItem.status,
      after_status: data.status,
      category: data.category,
    },
  });

  return data;
}

export async function updateInventoryItem(id, payload) {
  return updateInventory(id, payload);
}