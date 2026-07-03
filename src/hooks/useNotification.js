import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getNotifications } from "../services/notificationService";

export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadNotifications() {
    const data = await getNotifications(userId);
    setNotifications(data || []);
  }

  return { notifications, setNotifications };
}