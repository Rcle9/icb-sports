import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createFacility(payload) {
  const { data, error } = await supabase
    .from("facilities")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.updated_by || null,
    actor_role: "admin",
    action_type: "create",
    entity_type: "facility",
    entity_id: data.id,
    description: `Created facility: ${data.name}`,
    metadata: {
      name: data.name,
      type: data.type,
      price: data.price,
      is_active: data.is_active,
    },
  });

  return data;
}

export async function updateFacility(id, payload) {
  const { data: beforeFacility, error: beforeError } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .single();

  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("facilities")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: payload.updated_by || null,
    actor_role: "admin",
    action_type: "update",
    entity_type: "facility",
    entity_id: data.id,
    description: `Updated facility: ${data.name}`,
    metadata: {
      before: {
        name: beforeFacility.name,
        type: beforeFacility.type,
        price: beforeFacility.price,
        is_active: beforeFacility.is_active,
      },
      after: {
        name: data.name,
        type: data.type,
        price: data.price,
        is_active: data.is_active,
      },
    },
  });

  return data;
}

export async function deleteFacility(id, actorId = null) {
  const { data: facility, error: readError } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase
    .from("facilities")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await createActivityLog({
    actor_id: actorId,
    actor_role: "admin",
    action_type: "delete",
    entity_type: "facility",
    entity_id: id,
    description: `Deleted facility: ${facility.name}`,
    metadata: {
      name: facility.name,
      type: facility.type,
      price: facility.price,
    },
  });
}