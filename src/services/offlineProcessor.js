import { getOfflineQueue, removeOfflineAction } from "./syncService";
import { createBooking } from "./bookingService";
import { createMaintenanceRequest } from "./maintenanceService";
import { createCoachBooking } from "./coachingService";

export async function processOfflineQueue() {
  const queue = getOfflineQueue();

  if (!queue.length) return;

  for (const action of queue) {
    try {
      if (action.type === "booking") {
        await createBooking(action.payload);
      }

      if (action.type === "maintenance") {
        await createMaintenanceRequest(action.payload);
      }

      if (action.type === "coaching") {
        await createCoachBooking(action.payload);
      }

      removeOfflineAction(action.id);
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error.message);
    }
  }
}