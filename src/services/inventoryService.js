import { supabase } from "./supabaseClient";

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
export async function deleteInventory(id) {
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createInventoryItem(payload) {
  const cleanPayload = {
    name: payload.name,
    category: payload.category,
    description: payload.description || "",
    image_url: payload.image_url || "",
    price: Number(payload.price || 0),
    quantity: Number(payload.quantity || 0),
    min_threshold: Number(payload.min_threshold || 5),
    status: payload.status || "in_stock",
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  const { data, error } = await supabase
    .from("inventory")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInventory(id, payload) {
  const cleanPayload = {
    ...payload,
    price:
      payload.price !== undefined ? Number(payload.price || 0) : undefined,
    quantity:
      payload.quantity !== undefined ? Number(payload.quantity || 0) : undefined,
    min_threshold:
      payload.min_threshold !== undefined
        ? Number(payload.min_threshold || 5)
        : undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) delete cleanPayload[key];
  });

  const { data, error } = await supabase
    .from("inventory")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}