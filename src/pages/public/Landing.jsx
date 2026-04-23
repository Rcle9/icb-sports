import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#0f172a]">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">InCredoBall Sports</h1>

          <nav className="flex items-center gap-4">
            <Link to="/help" className="text-sm text-gray-600 hover:text-black">
              Help
            </Link>
            <Link to="/contact" className="text-sm text-gray-600 hover:text-black">
              Contact
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-sm font-semibold text-blue-600 mb-3">
            Sports Management Platform
          </p>
          <h2 className="text-5xl font-bold leading-tight mb-6">
            Manage bookings, coaching, inventory, and operations in one system.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            InCredoBall Sports helps members, staff, and administrators manage
            facilities, coaching schedules, maintenance requests, and inventory
            with real-time updates and offline support.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl border bg-white font-semibold hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-blue-50 p-5">
              <h3 className="font-bold mb-2">Smart Booking</h3>
              <p className="text-sm text-gray-600">
                Book sports facilities with approval workflow and overlap protection.
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 p-5">
              <h3 className="font-bold mb-2">Coaching Management</h3>
              <p className="text-sm text-gray-600">
                Manage coach schedules, requests, and session approvals.
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-5">
              <h3 className="font-bold mb-2">Inventory Tracking</h3>
              <p className="text-sm text-gray-600">
                Monitor stock levels, low-stock alerts, and item availability.
              </p>
            </div>

            <div className="rounded-2xl bg-purple-50 p-5">
              <h3 className="font-bold mb-2">Maintenance Workflow</h3>
              <p className="text-sm text-gray-600">
                Handle repair requests, monitoring, and replacement needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">For Members</h3>
            <p className="text-gray-600 text-sm">
              Book facilities, request coaching sessions, and stay updated with notifications.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">For Staff</h3>
            <p className="text-gray-600 text-sm">
              Approve requests, manage schedules, track inventory, and process maintenance.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">For Admins</h3>
            <p className="text-gray-600 text-sm">
              View analytics, manage user roles, monitor operations, and oversee the whole system.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p>© 2026 InCredoBall Sports. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/help" className="hover:text-black">Help</Link>
            <Link to="/contact" className="hover:text-black">Contact</Link>
            <Link to="/login" className="hover:text-black">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}