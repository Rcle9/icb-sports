// src/pages/admin/Notifications.jsx

import RoleNotifications from "../shared/RoleNotifications";

export default function AdminNotifications() {
  return (
    <RoleNotifications
      role="admin"
      title="Admin Notifications"
      subtitle="Admin system and booking alerts"
      heroEyebrow="Admin Notification Center"
      heroTitle="Monitor system-wide notifications."
      heroDescription="View booking alerts, payment verification updates, facility notices, user activity, and important system messages for administrators."
      defaultActionPath="/admin/manage-bookings"
      defaultTimelinePath="/admin/manage-bookings"
      bookingActionPath="/admin/manage-bookings"
    />
  );
}