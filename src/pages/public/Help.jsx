import { Link } from "react-router-dom";

export default function Help() {
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#0f172a]">Help Center</h1>
            <p className="text-gray-600 mt-2">
              Find answers about bookings, coaching, accounts, and system usage.
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2">How do I book a facility?</h2>
            <p className="text-gray-600">
              Go to the Booking page, select a facility, choose a date, and click an available time slot.
              Your request will be submitted for staff approval.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2">How do coaching requests work?</h2>
            <p className="text-gray-600">
              Members can select an available coach schedule and submit a request.
              Staff reviews the request before approval or rejection.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2">What happens if I lose connection?</h2>
            <p className="text-gray-600">
              Some actions, like booking requests and maintenance requests, are saved locally while offline
              and automatically synced when your connection returns.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2">How do I reset my password?</h2>
            <p className="text-gray-600">
              Open Profile Settings and use the password reset option. A reset email will be sent to your account.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2">Who can manage schedules and requests?</h2>
            <p className="text-gray-600">
              Staff members handle bookings, coaching requests, inventory, and maintenance.
              Admins can manage users, analytics, and system oversight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}