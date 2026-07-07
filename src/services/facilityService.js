// src/services/facilityService.js

import { supabase } from "./supabaseClient";
import { createAdminNotification, createStaffNotification } from "./notificationService";

function cleanString(value) {
  return String(value || "").trim();
}

function cleanNumber(value) {
  return Number(value || 0);
}

function cleanBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function cleanImageUrls(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function buildFacilityMetadata(facility = {}) {
  return {
    facility_id: facility.id || null,
    name: facility.name || null,
    type: facility.type || null,
    description: facility.description || "",
    image_url: facility.image_url || "",
    image_urls: facility.image_urls || [],
    price: facility.price || 0,
    is_active: facility.is_active ?? true,
    created_by: facility.created_by || null,
    updated_by: facility.updated_by || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Facility notification error:", error?.message || error);
  }
}

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getActiveFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getFacilityById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function createFacility(payload = {}) {
  const imageUrls = cleanImageUrls(payload.image_urls);
  const mainImageUrl = cleanString(payload.image_url) || imageUrls[0] || "";

  const cleanPayload = {
    name: cleanString(payload.name),
    type: cleanString(payload.type),
    description: cleanString(payload.description),
    image_url: mainImageUrl,
    image_urls: imageUrls,
    price: cleanNumber(payload.price),
    is_active: cleanBoolean(payload.is_active, true),
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
  };

  if (!cleanPayload.name) {
    throw new Error("Facility name is required.");
  }

  if (!cleanPayload.type) {
    throw new Error("Facility type is required.");
  }

  const { data, error } = await supabase
    .from("facilities")
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;

  const metadata = buildFacilityMetadata(data);

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Facility Added",
      message: `${data.name} was added to the facility list.`,
      type: "facility_created",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/admin/facilities",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createStaffNotification({
      title: "New Facility Available",
      message: `${data.name} is now listed in the facility system.`,
      type: "facility_created",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/staff/availability-board",
      metadata,
    });
  });

  return data;
}

export async function updateFacility(id, payload = {}) {
  if (!id) {
    throw new Error("Facility ID is required.");
  }

  const cleanPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) {
    cleanPayload.name = cleanString(payload.name);
  }

  if (payload.type !== undefined) {
    cleanPayload.type = cleanString(payload.type);
  }

  if (payload.description !== undefined) {
    cleanPayload.description = cleanString(payload.description);
  }

  if (payload.price !== undefined) {
    cleanPayload.price = cleanNumber(payload.price);
  }

  if (payload.is_active !== undefined) {
    cleanPayload.is_active = cleanBoolean(payload.is_active, true);
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

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { data, error } = await supabase
    .from("facilities")
    .update(cleanPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const metadata = buildFacilityMetadata(data);

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Facility Updated",
      message: `${data.name} facility details were updated.`,
      type: "facility_updated",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/admin/facilities",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Facility Updated",
      message: `${data.name} facility details were updated.`,
      type: "facility_updated",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/staff/availability-board",
      metadata,
    });
  });

  return data;
}

export async function toggleFacilityStatus(id, isActive) {
  if (!id) {
    throw new Error("Facility ID is required.");
  }

  const { data, error } = await supabase
    .from("facilities")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const metadata = buildFacilityMetadata(data);

  await safeNotify(async () => {
    await createAdminNotification({
      title: Boolean(isActive) ? "Facility Activated" : "Facility Deactivated",
      message: `${data.name} was ${
        Boolean(isActive) ? "activated" : "deactivated"
      }.`,
      type: Boolean(isActive) ? "facility_activated" : "facility_deactivated",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/admin/facilities",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createStaffNotification({
      title: Boolean(isActive) ? "Facility Activated" : "Facility Deactivated",
      message: `${data.name} was ${
        Boolean(isActive) ? "activated" : "deactivated"
      }.`,
      type: Boolean(isActive) ? "facility_activated" : "facility_deactivated",
      referenceId: data.id,
      referenceType: "facilities",
      actionUrl: "/staff/availability-board",
      metadata,
    });
  });

  return data;
}

export async function deleteFacility(id) {
  if (!id) {
    throw new Error("Facility ID is required.");
  }

  const facility = await getFacilityById(id);

  const { error } = await supabase.from("facilities").delete().eq("id", id);

  if (error) throw error;

  if (facility) {
    const metadata = buildFacilityMetadata(facility);

    await safeNotify(async () => {
      await createAdminNotification({
        title: "Facility Deleted",
        message: `${facility.name} was removed from the facility list.`,
        type: "facility_deleted",
        referenceId: facility.id,
        referenceType: "facilities",
        actionUrl: "/admin/facilities",
        metadata,
      });
    });

    await safeNotify(async () => {
      await createStaffNotification({
        title: "Facility Deleted",
        message: `${facility.name} was removed from the facility list.`,
        type: "facility_deleted",
        referenceId: facility.id,
        referenceType: "facilities",
        actionUrl: "/staff/availability-board",
        metadata,
      });
    });
  }

  return true;
}