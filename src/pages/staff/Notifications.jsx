// src/pages/staff/Notifications.jsx

import RoleNotifications from "../shared/RoleNotifications";

export default function StaffNotifications() {
  return (
    <RoleNotifications
      role="staff"
      title="Staff Notifications"
      subtitle="Staff booking and payment alerts"
      heroEyebrow="Staff Notification Center"
      heroTitle="Review booking and payment updates."
      heroDescription="View booking requests, payment proof uploads, verification alerts, facility updates, and system notices for staff operations."
      defaultActionPath="/staff/manage-bookings"
      defaultTimelinePath="/staff/manage-bookings"
      bookingActionPath="/staff/manage-bookings"
    />
  );
}