import { supabase } from "./supabaseClient";

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function getInventoryStatus(quantity) {
  const qty = Number(quantity || 0);

  if (qty <= 0) return "out_of_stock";
  if (qty <= 5) return "low_stock";
  return "in_stock";
}

export async function createInventory(payload) {
  const quantity = Number(payload.quantity || 0);

  const cleanPayload = {
    name: payload.name,
    category: payload.category || "merchandise",
    description: payload.description || "",
    image_url: payload.image_url || "",
    image_urls: payload.image_urls || [],
    price: Number(payload.price || 0),
    quantity,
    status: getInventoryStatus(quantity),
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
  const quantity =
    payload.quantity !== undefined ? Number(payload.quantity || 0) : undefined;

  const cleanPayload = {
    ...payload,
    price: payload.price !== undefined ? Number(payload.price || 0) : undefined,
    quantity,
    image_urls: payload.image_urls || [],
    updated_at: new Date().toISOString(),
  };

  if (quantity !== undefined) {
    cleanPayload.status = getInventoryStatus(quantity);
  }

  delete cleanPayload.low_stock_threshold;

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

export async function deleteInventory(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) throw error;
  return true;
}