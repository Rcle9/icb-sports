import { useEffect, useState } from "react";
import useOnlineStatus from "../../hooks/useOnlineStatus";
import { getOfflineQueue } from "../../services/syncService";

export default function ConnectionBanner() {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setQueueCount(getOfflineQueue().length);

    function refreshQueueCount() {
      setQueueCount(getOfflineQueue().length);
    }

    window.addEventListener("storage", refreshQueueCount);
    window.addEventListener("online", refreshQueueCount);

    return () => {
      window.removeEventListener("storage", refreshQueueCount);
      window.removeEventListener("online", refreshQueueCount);
    };
  }, [isOnline]);

  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
        isOnline
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-orange-50 text-orange-700 border border-orange-200"
      }`}
    >
      {isOnline
        ? `You are online. ${queueCount} queued action${queueCount !== 1 ? "s" : ""} will sync automatically.`
        : `You are offline. ${queueCount} action${queueCount !== 1 ? "s" : ""} queued locally.`}
    </div>
  );
}