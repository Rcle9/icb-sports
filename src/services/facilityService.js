import { supabase } from "./supabaseClient";

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createFacility(payload) {
  const cleanPayload = {
    name: payload.name,
    type: payload.type,
    description: payload.description || "",
    image_url: payload.image_url || "",
    image_urls: payload.image_urls || [],
    price: Number(payload.price || 0),
    is_active: payload.is_active ?? true,
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  const { data, error } = await supabase
    .from("facilities")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFacility(id, payload) {
  const cleanPayload = {
    ...payload,
    image_urls: payload.image_urls || [],
    price:
      payload.price !== undefined ? Number(payload.price || 0) : undefined,
    updated_at: new Date().toISOString(),
  };

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) delete cleanPayload[key];
  });

  const { data, error } = await supabase
    .from("facilities")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFacility(id) {
  const { error } = await supabase.from("facilities").delete().eq("id", id);

  if (error) throw error;
  return true;
}