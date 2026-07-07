// src/services/offlineProcessor.js

const QUEUE_KEY = "icb_offline_queue";
const SETTINGS_KEY = "icb_offline_settings";

function getNow() {
  return new Date().toISOString();
}

function createId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getQueue() {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(QUEUE_KEY);
  const queue = safeParse(raw, []);

  return Array.isArray(queue) ? queue : [];
}

function saveQueue(queue = []) {
  if (typeof window === "undefined") return;

  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function getSettings() {
  if (typeof window === "undefined") {
    return {
      enabled: true,
      last_sync_at: null,
    };
  }

  const raw = localStorage.getItem(SETTINGS_KEY);

  return {
    enabled: true,
    last_sync_at: null,
    ...safeParse(raw, {}),
  };
}

function saveSettings(settings = {}) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...getSettings(),
      ...settings,
    })
  );
}

function normalizeAction(action) {
  return String(action || "unknown").toLowerCase();
}

function normalizeStatus(status) {
  const value = String(status || "pending").toLowerCase();

  if (value === "processing") return "processing";
  if (value === "completed") return "completed";
  if (value === "failed") return "failed";

  return "pending";
}

export function isOnline() {
  if (typeof navigator === "undefined") return true;

  return navigator.onLine;
}

export function getOfflineQueue() {
  return getQueue();
}

export function getOfflineQueueCount() {
  return getQueue().filter((item) => normalizeStatus(item.status) === "pending")
    .length;
}

export function getFailedQueueCount() {
  return getQueue().filter((item) => normalizeStatus(item.status) === "failed")
    .length;
}

export function getOfflineSettings() {
  return getSettings();
}

export function setOfflineProcessingEnabled(enabled) {
  saveSettings({
    enabled: Boolean(enabled),
  });

  return getSettings();
}

export function addOfflineAction({
  action,
  table = "",
  payload = {},
  metadata = {},
  priority = "normal",
}) {
  const item = {
    id: createId(),
    action: normalizeAction(action),
    table,
    payload,
    metadata,
    priority,
    status: "pending",
    attempts: 0,
    error: null,
    created_at: getNow(),
    updated_at: getNow(),
    processed_at: null,
  };

  const queue = getQueue();
  queue.push(item);
  saveQueue(queue);

  return item;
}

export function updateOfflineAction(id, updates = {}) {
  if (!id) return null;

  const queue = getQueue();

  const nextQueue = queue.map((item) =>
    item.id === id
      ? {
          ...item,
          ...updates,
          status: updates.status
            ? normalizeStatus(updates.status)
            : normalizeStatus(item.status),
          updated_at: getNow(),
        }
      : item
  );

  saveQueue(nextQueue);

  return nextQueue.find((item) => item.id === id) || null;
}

export function removeOfflineAction(id) {
  if (!id) return false;

  const queue = getQueue().filter((item) => item.id !== id);
  saveQueue(queue);

  return true;
}

export function clearOfflineQueue() {
  saveQueue([]);

  return true;
}

export function clearCompletedOfflineActions() {
  const queue = getQueue().filter(
    (item) => normalizeStatus(item.status) !== "completed"
  );

  saveQueue(queue);

  return queue;
}

export function clearFailedOfflineActions() {
  const queue = getQueue().filter(
    (item) => normalizeStatus(item.status) !== "failed"
  );

  saveQueue(queue);

  return queue;
}

export function retryFailedOfflineActions() {
  const queue = getQueue().map((item) => {
    if (normalizeStatus(item.status) !== "failed") return item;

    return {
      ...item,
      status: "pending",
      error: null,
      updated_at: getNow(),
    };
  });

  saveQueue(queue);

  return queue;
}

export function addBookingOffline(payload = {}, metadata = {}) {
  return addOfflineAction({
    action: "create_booking",
    table: "bookings",
    payload,
    metadata,
    priority: "high",
  });
}

export function addWalkInBookingOffline(payload = {}, metadata = {}) {
  return addOfflineAction({
    action: "create_walk_in_booking",
    table: "bookings",
    payload,
    metadata,
    priority: "high",
  });
}

export function addInventoryOffline(action, payload = {}, metadata = {}) {
  return addOfflineAction({
    action,
    table: "inventory",
    payload,
    metadata,
    priority: "normal",
  });
}

export function addMaintenanceOffline(action, payload = {}, metadata = {}) {
  return addOfflineAction({
    action,
    table: "maintenance",
    payload,
    metadata,
    priority: "normal",
  });
}

export async function processOfflineQueue(handlers = {}) {
  const settings = getSettings();

  if (!settings.enabled) {
    return {
      processed: 0,
      failed: 0,
      skipped: true,
      message: "Offline processing is disabled.",
    };
  }

  if (!isOnline()) {
    return {
      processed: 0,
      failed: 0,
      skipped: true,
      message: "Device is offline.",
    };
  }

  const queue = getQueue();

  let processed = 0;
  let failed = 0;

  const nextQueue = [];

  for (const item of queue) {
    const status = normalizeStatus(item.status);

    if (status === "completed") {
      nextQueue.push(item);
      continue;
    }

    if (status !== "pending" && status !== "failed") {
      nextQueue.push(item);
      continue;
    }

    const handler = handlers[item.action] || handlers.default;

    if (typeof handler !== "function") {
      nextQueue.push({
        ...item,
        status: "failed",
        attempts: Number(item.attempts || 0) + 1,
        error: `No handler found for action: ${item.action}`,
        updated_at: getNow(),
      });

      failed += 1;
      continue;
    }

    try {
      const processingItem = {
        ...item,
        status: "processing",
        attempts: Number(item.attempts || 0) + 1,
        updated_at: getNow(),
      };

      saveQueue([
        ...nextQueue,
        processingItem,
        ...queue.filter(
          (queuedItem) =>
            queuedItem.id !== item.id &&
            !nextQueue.some((savedItem) => savedItem.id === queuedItem.id)
        ),
      ]);

      await handler(item.payload, item);

      nextQueue.push({
        ...processingItem,
        status: "completed",
        error: null,
        processed_at: getNow(),
        updated_at: getNow(),
      });

      processed += 1;
    } catch (error) {
      nextQueue.push({
        ...item,
        status: "failed",
        attempts: Number(item.attempts || 0) + 1,
        error: error.message || "Processing failed.",
        updated_at: getNow(),
      });

      failed += 1;
    }
  }

  saveQueue(nextQueue);

  saveSettings({
    last_sync_at: getNow(),
  });

  return {
    processed,
    failed,
    skipped: false,
    message: `Processed ${processed} item(s), failed ${failed} item(s).`,
  };
}

export function watchOnlineStatus({
  onOnline,
  onOffline,
  processOnReconnect = false,
  handlers = {},
} = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  async function handleOnline() {
    if (typeof onOnline === "function") {
      onOnline();
    }

    if (processOnReconnect) {
      await processOfflineQueue(handlers);
    }
  }

  function handleOffline() {
    if (typeof onOffline === "function") {
      onOffline();
    }
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

export function getOfflineSummary() {
  const queue = getQueue();

  const summary = queue.reduce(
    (acc, item) => {
      const status = normalizeStatus(item.status);

      acc.total += 1;

      if (status === "pending") acc.pending += 1;
      if (status === "processing") acc.processing += 1;
      if (status === "completed") acc.completed += 1;
      if (status === "failed") acc.failed += 1;

      return acc;
    },
    {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }
  );

  return {
    ...summary,
    online: isOnline(),
    settings: getSettings(),
  };
}

/* Backward-compatible names */

export function queueOfflineAction(actionData = {}) {
  return addOfflineAction(actionData);
}

export function getPendingOfflineActions() {
  return getQueue().filter((item) => normalizeStatus(item.status) === "pending");
}

export function getFailedOfflineActions() {
  return getQueue().filter((item) => normalizeStatus(item.status) === "failed");
}

export function deleteOfflineAction(id) {
  return removeOfflineAction(id);
}

export function resetOfflineQueue() {
  return clearOfflineQueue();
}

export async function syncOfflineQueue(handlers = {}) {
  return processOfflineQueue(handlers);
}

export function subscribeOnlineStatus(callback) {
  return watchOnlineStatus({
    onOnline: () => callback?.(true),
    onOffline: () => callback?.(false),
  });
}