import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";

function cleanText(value) {
  return String(value || "").trim();
}

function getInventoryStatus(quantity) {
  const qty = Number(quantity || 0);

  if (qty <= 0) return "out_of_stock";
  if (qty <= 5) return "low_stock";
  return "in_stock";
}

function formatStatus(status) {
  return String(status || "").replaceAll("_", " ");
}

function getStockChangeLabel(beforeQuantity, afterQuantity) {
  const beforeQty = Number(beforeQuantity || 0);
  const afterQty = Number(afterQuantity || 0);

  if (afterQty > beforeQty) return "stock_increased";
  if (afterQty < beforeQty) return "stock_decreased";

  return "stock_unchanged";
}

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getInventoryById(id) {
  if (!id) throw new Error("Missing inventory ID.");

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Inventory item not found.");

  return data;
}

export async function createInventory(payload) {
  const quantity = Number(payload.quantity || 0);
  const status = getInventoryStatus(quantity);

  const cleanPayload = {
    name: cleanText(payload.name),
    category: payload.category || "merchandise",
    description: payload.description || "",
    image_url: payload.image_url || "",
    image_urls: payload.image_urls || [],
    price: Number(payload.price || 0),
    quantity,
    status,
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  if (!cleanPayload.name) {
    throw new Error("Inventory name is required.");
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert([cleanPayload])
    .select("*")
    .single();

  if (error) throw error;

  await createActivityLog({
    action: "inventory_created",
    module: "inventory",
    description: `Added inventory item: ${data.name}.`,
    reference_id: data.id,
    metadata: {
      inventory_id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      quantity: data.quantity,
      status: data.status,
      created_by: data.created_by || null,
    },
  });

  if (status === "low_stock" || status === "out_of_stock") {
    await createActivityLog({
      action: "inventory_stock_alert",
      module: "inventory",
      description: `${data.name} was added with ${formatStatus(status)} status.`,
      reference_id: data.id,
      metadata: {
        inventory_id: data.id,
        name: data.name,
        quantity: data.quantity,
        status: data.status,
      },
    });
  }

  return data;
}

export async function updateInventory(id, payload) {
  if (!id) throw new Error("Missing inventory ID.");

  const beforeItem = await getInventoryById(id);

  const quantity =
    payload.quantity !== undefined ? Number(payload.quantity || 0) : undefined;

  const cleanPayload = {
    ...payload,
    name: payload.name !== undefined ? cleanText(payload.name) : undefined,
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
    .select("*")
    .single();

  if (error) throw error;

  const beforeQuantity = Number(beforeItem.quantity || 0);
  const afterQuantity = Number(data.quantity || 0);
  const beforeStatus = beforeItem.status || getInventoryStatus(beforeQuantity);
  const afterStatus = data.status || getInventoryStatus(afterQuantity);
  const stockChange = getStockChangeLabel(beforeQuantity, afterQuantity);

  await createActivityLog({
    action:
      quantity !== undefined && beforeQuantity !== afterQuantity
        ? "inventory_stock_updated"
        : "inventory_updated",
    module: "inventory",
    description:
      quantity !== undefined && beforeQuantity !== afterQuantity
        ? `Updated stock for ${data.name} from ${beforeQuantity} to ${afterQuantity}.`
        : `Updated inventory item: ${data.name}.`,
    reference_id: data.id,
    metadata: {
      inventory_id: data.id,
      name_before: beforeItem.name || "",
      name_after: data.name || "",
      category_before: beforeItem.category || "",
      category_after: data.category || "",
      price_before: beforeItem.price || 0,
      price_after: data.price || 0,
      quantity_before: beforeQuantity,
      quantity_after: afterQuantity,
      stock_change: stockChange,
      status_before: beforeStatus,
      status_after: afterStatus,
      updated_by: data.updated_by || payload.updated_by || null,
    },
  });

  if (
    quantity !== undefined &&
    ["low_stock", "out_of_stock"].includes(afterStatus)
  ) {
    await createActivityLog({
      action: "inventory_stock_alert",
      module: "inventory",
      description: `${data.name} is now ${formatStatus(afterStatus)}.`,
      reference_id: data.id,
      metadata: {
        inventory_id: data.id,
        name: data.name,
        quantity_before: beforeQuantity,
        quantity_after: afterQuantity,
        status_before: beforeStatus,
        status_after: afterStatus,
      },
    });
  }

  return data;
}

export async function deleteInventory(id) {
  if (!id) throw new Error("Missing inventory ID.");

  const beforeItem = await getInventoryById(id);

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) throw error;

  await createActivityLog({
    action: "inventory_deleted",
    module: "inventory",
    description: `Deleted inventory item: ${beforeItem.name}.`,
    reference_id: beforeItem.id,
    metadata: {
      inventory_id: beforeItem.id,
      name: beforeItem.name,
      category: beforeItem.category,
      price: beforeItem.price,
      quantity: beforeItem.quantity,
      status: beforeItem.status,
      created_by: beforeItem.created_by || null,
      updated_by: beforeItem.updated_by || null,
    },
  });

  return true;
}