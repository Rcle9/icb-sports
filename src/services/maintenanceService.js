// src/services/maintenanceService.js

import { supabase } from "./supabaseClient";
import {
  createAdminNotification,
  createStaffNotification,
} from "./notificationService";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeStatus(status) {
  const value = String(status || "pending").toLowerCase();

  if (value === "completed") return "completed";
  if (value === "in_progress") return "in_progress";
  if (value === "cancelled") return "cancelled";

  return "pending";
}

function normalizePriority(priority) {
  const value = String(priority || "medium").toLowerCase();

  if (value === "low") return "low";
  if (value === "high") return "high";
  if (value === "urgent") return "urgent";

  return "medium";
}

function buildMaintenanceMetadata(item = {}) {
  return {
    maintenance_id: item.id || null,
    facility_id: item.facility_id || null,
    facility_name:
      item.facilities?.name || item.facility_name || item.facility || null,
    title: item.title || item.issue_title || null,
    description: item.description || item.issue_description || "",
    priority: item.priority || "medium",
    status: item.status || "pending",
    scheduled_date: item.scheduled_date || item.date || null,
    start_time: item.start_time || null,
    end_time: item.end_time || null,
    created_by: item.created_by || null,
    assigned_to: item.assigned_to || null,
    completed_at: item.completed_at || null,
  };
}

async function safeNotify(fn) {
  try {
    await fn();
  } catch (error) {
    console.error("Maintenance notification error:", error?.message || error);
  }
}

export async function getMaintenanceRecords() {
  const { data, error } = await supabase
    .from("maintenance")
    .select(
      `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getActiveMaintenanceRecords() {
  const { data, error } = await supabase
    .from("maintenance")
    .select(
      `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .in("status", ["pending", "in_progress"])
    .order("scheduled_date", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getMaintenanceById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("maintenance")
    .select(
      `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function createMaintenanceRecord(payload = {}) {
  const cleanPayload = {
    facility_id: payload.facility_id || null,
    title: cleanString(payload.title || payload.issue_title),
    description: cleanString(payload.description || payload.issue_description),
    priority: normalizePriority(payload.priority),
    status: normalizeStatus(payload.status || "pending"),
    scheduled_date: payload.scheduled_date || payload.date || null,
    start_time: payload.start_time || null,
    end_time: payload.end_time || null,
    created_by: payload.created_by || null,
    assigned_to: payload.assigned_to || null,
    notes: cleanString(payload.notes),
  };

  if (!cleanPayload.facility_id) {
    throw new Error("Facility is required.");
  }

  if (!cleanPayload.title) {
    throw new Error("Maintenance title is required.");
  }

  const { data, error } = await supabase
    .from("maintenance")
    .insert([cleanPayload])
    .select(
      `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .single();

  if (error) throw error;

  const metadata = buildMaintenanceMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Maintenance Scheduled",
      message: `${data.title} was added for ${
        data.facilities?.name || "a facility"
      }.`,
      type: "maintenance_added",
      referenceId: data.id,
      referenceType: "maintenance",
      actionUrl: "/staff/maintenance",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Maintenance Scheduled",
      message: `${data.title} was added for ${
        data.facilities?.name || "a facility"
      }.`,
      type: "maintenance_added",
      referenceId: data.id,
      referenceType: "maintenance",
      actionUrl: "/staff/maintenance",
      metadata,
    });
  });

  return data;
}

export async function updateMaintenanceRecord(id, payload = {}) {
  if (!id) {
    throw new Error("Maintenance ID is required.");
  }

  const cleanPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined || payload.issue_title !== undefined) {
    cleanPayload.title = cleanString(payload.title || payload.issue_title);
    delete cleanPayload.issue_title;
  }

  if (
    payload.description !== undefined ||
    payload.issue_description !== undefined
  ) {
    cleanPayload.description = cleanString(
      payload.description || payload.issue_description
    );
    delete cleanPayload.issue_description;
  }

  if (payload.notes !== undefined) {
    cleanPayload.notes = cleanString(payload.notes);
  }

  if (payload.priority !== undefined) {
    cleanPayload.priority = normalizePriority(payload.priority);
  }

  if (payload.date !== undefined && payload.scheduled_date === undefined) {
    cleanPayload.scheduled_date = payload.date;
    delete cleanPayload.date;
  }

  if (payload.status !== undefined) {
    cleanPayload.status = normalizeStatus(payload.status);

    if (cleanPayload.status === "completed") {
      cleanPayload.completed_at = new Date().toISOString();
    }

    if (cleanPayload.status !== "completed") {
      cleanPayload.completed_at = null;
    }
  }

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { data, error } = await supabase
    .from("maintenance")
    .update(cleanPayload)
    .eq("id", id)
    .select(
      `
      *,
      facilities (*),
      creator:created_by (
        id,
        full_name,
        email,
        role
      ),
      assignee:assigned_to (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .single();

  if (error) throw error;

  const metadata = buildMaintenanceMetadata(data);

  await safeNotify(async () => {
    await createStaffNotification({
      title: "Maintenance Updated",
      message: `${data.title} status is now ${formatMaintenanceStatus(
        data.status
      )}.`,
      type: "maintenance_update",
      referenceId: data.id,
      referenceType: "maintenance",
      actionUrl: "/staff/maintenance",
      metadata,
    });
  });

  await safeNotify(async () => {
    await createAdminNotification({
      title: "Maintenance Updated",
      message: `${data.title} status is now ${formatMaintenanceStatus(
        data.status
      )}.`,
      type: "maintenance_update",
      referenceId: data.id,
      referenceType: "maintenance",
      actionUrl: "/staff/maintenance",
      metadata,
    });
  });

  return data;
}

export async function updateMaintenanceStatus(id, status, notes = "") {
  return updateMaintenanceRecord(id, {
    status,
    notes,
  });
}

export async function completeMaintenanceRecord(id, notes = "") {
  return updateMaintenanceRecord(id, {
    status: "completed",
    notes,
  });
}

export async function cancelMaintenanceRecord(id, notes = "") {
  return updateMaintenanceRecord(id, {
    status: "cancelled",
    notes,
  });
}

export async function deleteMaintenanceRecord(id) {
  if (!id) {
    throw new Error("Maintenance ID is required.");
  }

  const record = await getMaintenanceById(id);

  const { error } = await supabase.from("maintenance").delete().eq("id", id);

  if (error) throw error;

  if (record) {
    const metadata = buildMaintenanceMetadata(record);

    await safeNotify(async () => {
      await createStaffNotification({
        title: "Maintenance Deleted",
        message: `${record.title} was removed from maintenance records.`,
        type: "maintenance_deleted",
        referenceId: record.id,
        referenceType: "maintenance",
        actionUrl: "/staff/maintenance",
        metadata,
      });
    });

    await safeNotify(async () => {
      await createAdminNotification({
        title: "Maintenance Deleted",
        message: `${record.title} was removed from maintenance records.`,
        type: "maintenance_deleted",
        referenceId: record.id,
        referenceType: "maintenance",
        actionUrl: "/staff/maintenance",
        metadata,
      });
    });
  }

  return true;
}

export function formatMaintenanceStatus(status) {
  const value = normalizeStatus(status);

  if (value === "completed") return "Completed";
  if (value === "in_progress") return "In Progress";
  if (value === "cancelled") return "Cancelled";

  return "Pending";
}

export function formatMaintenancePriority(priority) {
  const value = normalizePriority(priority);

  if (value === "low") return "Low";
  if (value === "high") return "High";
  if (value === "urgent") return "Urgent";

  return "Medium";
}

export function getMaintenanceStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === "completed") return "bg-green-100 text-green-700";
  if (value === "in_progress") return "bg-blue-100 text-blue-700";
  if (value === "cancelled") return "bg-red-100 text-red-700";

  return "bg-amber-100 text-amber-700";
}

export function getMaintenancePriorityClass(priority) {
  const value = normalizePriority(priority);

  if (value === "low") return "bg-slate-100 text-slate-700";
  if (value === "high") return "bg-orange-100 text-orange-700";
  if (value === "urgent") return "bg-red-100 text-red-700";

  return "bg-blue-100 text-blue-700";
}

export function isFacilityUnderMaintenance(maintenanceRecords = [], facilityId) {
  if (!facilityId) return false;

  return maintenanceRecords.some((record) => {
    const status = normalizeStatus(record.status);

    return (
      String(record.facility_id) === String(facilityId) &&
      ["pending", "in_progress"].includes(status)
    );
  });
}

/* Backward-compatible exports for your current Maintenance.jsx */
export async function getMaintenanceRequests() {
  return getMaintenanceRecords();
}

export async function getMaintenanceRequestById(id) {
  return getMaintenanceById(id);
}

export async function createMaintenanceRequest(payload = {}) {
  return createMaintenanceRecord(payload);
}

export async function updateMaintenanceRequest(id, payload = {}) {
  return updateMaintenanceRecord(id, payload);
}

export async function deleteMaintenanceRequest(id) {
  return deleteMaintenanceRecord(id);
}

export async function completeMaintenanceRequest(id, notes = "") {
  return completeMaintenanceRecord(id, notes);
}

export async function cancelMaintenanceRequest(id, notes = "") {
  return cancelMaintenanceRecord(id, notes);
}