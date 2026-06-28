import { getOfflineQueue, removeOfflineAction } from "./syncService";
import { createBooking } from "./bookingService";
import { createMaintenanceRequest } from "./maintenanceService";

export async function processOfflineQueue() {
  const queue = getOfflineQueue();

  if (!queue.length) return;

  for (const action of queue) {
    try {
      if (action.type === "booking") {
        await createBooking(action.payload);
        removeOfflineAction(action.id);
        continue;
      }

      if (action.type === "maintenance") {
        await createMaintenanceRequest(action.payload);
        removeOfflineAction(action.id);
        continue;
      }

      removeOfflineAction(action.id);
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error.message);
    }
  }
}