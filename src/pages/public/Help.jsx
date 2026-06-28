import { Link } from "react-router-dom";

export default function Help() {
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#0f172a]">
              Help Center
            </h1>

            <p className="mt-2 text-gray-600">
              Find answers about facility bookings, accounts, products,
              maintenance, and system usage.
            </p>
          </div>

          <Link
            to="/"
            className="rounded-xl border bg-white px-4 py-2 hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              How do I book a facility?
            </h2>

            <p className="text-gray-600">
              Go to the Booking page, select a facility, choose a date, and
              click an available time slot. Your request will be submitted for
              staff approval.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              How do booking approvals work?
            </h2>

            <p className="text-gray-600">
              After a user submits a facility booking request, staff can approve
              or reject it. Users will receive real-time notifications when
              their booking status changes.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              What happens if I lose connection?
            </h2>

            <p className="text-gray-600">
              Some actions, like booking requests and maintenance requests, are
              saved locally while offline and automatically synced when your
              connection returns.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              How do I reset my password?
            </h2>

            <p className="text-gray-600">
              Open Profile Settings and use the password reset option. A reset
              email will be sent to your account.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              Who can manage schedules and requests?
            </h2>

            <p className="text-gray-600">
              Staff members handle facility bookings, inventory, and
              maintenance. Admins can manage users, facilities, analytics,
              reports, and system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}