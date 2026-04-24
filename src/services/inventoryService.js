import { supabase } from "./supabaseClient";

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
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
    low_stock_threshold: Number(payload.low_stock_threshold || 5),
    status: quantity <= 0 ? "out_of_stock" : quantity <= 5 ? "low_stock" : "available",
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
    image_urls: payload.image_urls || [],
    price: payload.price !== undefined ? Number(payload.price || 0) : undefined,
    quantity,
    status:
      quantity === undefined
        ? undefined
        : quantity <= 0
        ? "out_of_stock"
        : quantity <= 5
        ? "low_stock"
        : "available",
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

export async function deleteInventory(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) throw error;
  return true;
}