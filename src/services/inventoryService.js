// src/services/inventoryService.js

import { supabase } from "./supabaseClient";
import {
  createAdminNotification,
  createStaffNotification,
} from "./notificationService";

const INVENTORY_BUCKET = "inventory-images";

function cleanString(value) {
  return String(value || "").trim();
}

function cleanNumber(value) {
  return Number(value || 0);
}

function cleanImageUrls(value) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function getStockStatus(quantity, lowStockThreshold = 5) {
  const stock = Number(quantity || 0);
  const threshold = Number(lowStockThreshold || 5);

  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";

  return "in_stock";
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function buildInventoryMetadata(item = {}) {
  return {
    item_id: item.id || null,
    name: item.name || null,
    category: item.category || null,
    description: item.description || "",
    price: item.price || 0,
    quantity: item.quantity || 0,
    low_stock_threshold: item.low_stock_threshold || 5,
    stock_status: getStockStatus(item.quantity, item.low_stock_threshold),
    image_url: item.image_url || "",
    image_urls: item.image_urls || [],
    is_active: item.is_active ?? true,
    created_by: item.created_by || null,
    updated_by: item.updated_by || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Inventory notification error:", error?.message || error);
  }
}

function getFileExtension(file) {
  const name = file?.name || "";
  return name.split(".").pop() || "png";
}

export async function uploadInventoryImage(file, itemId = "new") {
  if (!file) return null;

  const extension = getFileExtension(file);
  const filePath = `${itemId}/inventory-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(INVENTORY_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(INVENTORY_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getActiveInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getInventoryItemById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function createInventoryItem(payload = {}) {
  const imageUrls = cleanImageUrls(payload.image_urls);
  const mainImageUrl = cleanString(payload.image_url) || imageUrls[0] || "";

  const cleanPayload = {
    name: cleanString(payload.name),
    category: cleanString(payload.category),
    description: cleanString(payload.description),
    price: cleanNumber(payload.price),
    quantity: cleanNumber(payload.quantity),
    low_stock_threshold: cleanNumber(payload.low_stock_threshold || 5),
    image_url: mainImageUrl,
    image_urls: imageUrls,
    is_active:
      payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  if (!cleanPayload.name) {
    throw new Error("Product name is required.");
  }

  if (!cleanPayload.category) {
    throw new Error("Product category is required.");
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;

  const metadata = buildInventoryMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Inventory Item Added",
      message: `${data.name} was added to inventory.`,
      type: "inventory_created",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Inventory Item Added",
      message: `${data.name} was added to inventory.`,
      type: "inventory_created",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  if (getStockStatus(data.quantity, data.low_stock_threshold) === "low_stock") {
    await safeNotify(async () => {
      await createAdminNotification({
        title: "Low Stock Alert",
        message: `${data.name} is low on stock. Current quantity: ${data.quantity}.`,
        type: "inventory_low_stock",
        referenceId: data.id,
        referenceType: "inventory",
        actionUrl: "/staff/inventory",
        metadata,
      });
    });
  }

  return data;
}

export async function updateInventoryItem(id, payload = {}) {
  if (!id) {
    throw new Error("Inventory item ID is required.");
  }

  const cleanPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) {
    cleanPayload.name = cleanString(payload.name);
  }

  if (payload.category !== undefined) {
    cleanPayload.category = cleanString(payload.category);
  }

  if (payload.description !== undefined) {
    cleanPayload.description = cleanString(payload.description);
  }

  if (payload.price !== undefined) {
    cleanPayload.price = cleanNumber(payload.price);
  }

  if (payload.quantity !== undefined) {
    cleanPayload.quantity = cleanNumber(payload.quantity);
  }

  if (payload.low_stock_threshold !== undefined) {
    cleanPayload.low_stock_threshold = cleanNumber(payload.low_stock_threshold);
  }

  if (payload.image_urls !== undefined) {
    cleanPayload.image_urls = cleanImageUrls(payload.image_urls);
  }

  if (payload.image_url !== undefined) {
    cleanPayload.image_url = cleanString(payload.image_url);
  }

  if (
    cleanPayload.image_urls &&
    cleanPayload.image_urls.length > 0 &&
    !cleanPayload.image_url
  ) {
    cleanPayload.image_url = cleanPayload.image_urls[0];
  }

  if (payload.is_active !== undefined) {
    cleanPayload.is_active = Boolean(payload.is_active);
  }

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { data, error } = await supabase
    .from("inventory")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const metadata = buildInventoryMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Inventory Item Updated",
      message: `${data.name} was updated. Quantity: ${
        data.quantity
      }, Price: ${money(data.price)}.`,
      type: "inventory_updated",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Inventory Item Updated",
      message: `${data.name} inventory details were updated.`,
      type: "inventory_updated",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  const stockStatus = getStockStatus(data.quantity, data.low_stock_threshold);

  if (stockStatus === "low_stock" || stockStatus === "out_of_stock") {
    await safeNotify(async () => {
      await createAdminNotification({
        title:
          stockStatus === "out_of_stock"
            ? "Out of Stock Alert"
            : "Low Stock Alert",
        message:
          stockStatus === "out_of_stock"
            ? `${data.name} is out of stock.`
            : `${data.name} is low on stock. Current quantity: ${data.quantity}.`,
        type:
          stockStatus === "out_of_stock"
            ? "inventory_out_of_stock"
            : "inventory_low_stock",
        referenceId: data.id,
        referenceType: "inventory",
        actionUrl: "/staff/inventory",
        metadata,
      });
    });
  }

  return data;
}

export async function adjustInventoryStock(id, adjustment = 0, reason = "") {
  if (!id) {
    throw new Error("Inventory item ID is required.");
  }

  const item = await getInventoryItemById(id);

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  const currentQuantity = Number(item.quantity || 0);
  const adjustmentValue = Number(adjustment || 0);
  const newQuantity = Math.max(currentQuantity + adjustmentValue, 0);

  const data = await updateInventoryItem(id, {
    quantity: newQuantity,
  });

  const metadata = {
    ...buildInventoryMetadata(data),
    previous_quantity: currentQuantity,
    adjustment: adjustmentValue,
    new_quantity: newQuantity,
    reason: reason || "",
  };

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Inventory Stock Adjusted",
      message: `${data.name} stock was adjusted from ${currentQuantity} to ${newQuantity}.`,
      type: "inventory_stock_adjusted",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  return data;
}

export async function toggleInventoryStatus(id, isActive) {
  if (!id) {
    throw new Error("Inventory item ID is required.");
  }

  const { data, error } = await supabase
    .from("inventory")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const metadata = buildInventoryMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: Boolean(isActive) ? "Product Activated" : "Product Deactivated",
      message: `${data.name} was ${
        Boolean(isActive) ? "activated" : "deactivated"
      } in inventory.`,
      type: Boolean(isActive)
        ? "inventory_activated"
        : "inventory_deactivated",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: Boolean(isActive) ? "Product Activated" : "Product Deactivated",
      message: `${data.name} was ${
        Boolean(isActive) ? "activated" : "deactivated"
      } in inventory.`,
      type: Boolean(isActive)
        ? "inventory_activated"
        : "inventory_deactivated",
      referenceId: data.id,
      referenceType: "inventory",
      actionUrl: "/staff/inventory",
      metadata,
    });
  });

  return data;
}

export async function deleteInventoryItem(id) {
  if (!id) {
    throw new Error("Inventory item ID is required.");
  }

  const item = await getInventoryItemById(id);

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) throw error;

  if (item) {
    const metadata = buildInventoryMetadata(item);

    await safeNotify(async () => {
      await createStaffNotification({
        title: "Inventory Item Deleted",
        message: `${item.name} was removed from inventory.`,
        type: "inventory_deleted",
        referenceId: item.id,
        referenceType: "inventory",
        actionUrl: "/staff/inventory",
        metadata,
      });
    });

    await safeNotify(async () => {
      await createAdminNotification({
        title: "Inventory Item Deleted",
        message: `${item.name} was removed from inventory.`,
        type: "inventory_deleted",
        referenceId: item.id,
        referenceType: "inventory",
        actionUrl: "/staff/inventory",
        metadata,
      });
    });
  }

  return true;
}

export async function getLowStockItems() {
  const inventory = await getInventory();

  return inventory.filter((item) => {
    const status = getStockStatus(item.quantity, item.low_stock_threshold);
    return status === "low_stock" || status === "out_of_stock";
  });
}

export async function getInventoryStats() {
  const inventory = await getInventory();

  const stats = inventory.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const status = getStockStatus(item.quantity, item.low_stock_threshold);

      acc.totalItems += 1;
      acc.totalQuantity += quantity;
      acc.totalValue += quantity * price;

      if (status === "in_stock") acc.inStock += 1;
      if (status === "low_stock") acc.lowStock += 1;
      if (status === "out_of_stock") acc.outOfStock += 1;

      return acc;
    },
    {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
    }
  );

  return stats;
}

export function formatStockStatus(quantity, lowStockThreshold = 5) {
  const status = getStockStatus(quantity, lowStockThreshold);

  if (status === "out_of_stock") return "Out of Stock";
  if (status === "low_stock") return "Low Stock";

  return "In Stock";
}

export function getStockStatusClass(quantity, lowStockThreshold = 5) {
  const status = getStockStatus(quantity, lowStockThreshold);

  if (status === "out_of_stock") return "bg-red-100 text-red-700";
  if (status === "low_stock") return "bg-amber-100 text-amber-700";

  return "bg-green-100 text-green-700";
}

export function getInventoryImage(item) {
  if (!item) return "";

  if (item.image_url) return item.image_url;

  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) {
    return item.image_urls[0];
  }

  return "";
}

/* Backward-compatible exports for your existing Inventory.jsx */
export async function createInventory(payload = {}) {
  return createInventoryItem(payload);
}

export async function updateInventory(id, payload = {}) {
  return updateInventoryItem(id, payload);
}

export async function deleteInventory(id) {
  return deleteInventoryItem(id);
}

export async function getInventoryById(id) {
  return getInventoryItemById(id);
}

export async function updateStock(id, adjustment = 0, reason = "") {
  return adjustInventoryStock(id, adjustment, reason);
}

export async function toggleProductStatus(id, isActive) {
  return toggleInventoryStatus(id, isActive);
}