const STORAGE_KEY = "icb_offline_queue";

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function addOfflineAction(action) {
  const queue = getOfflineQueue();

  const offlineAction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...action,
  };

  queue.push(offlineAction);
  saveOfflineQueue(queue);

  return offlineAction;
}

export function removeOfflineAction(actionId) {
  const queue = getOfflineQueue().filter((item) => item.id !== actionId);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEY);
}