import { Link } from "react-router-dom";
import LandingLayout from "./LandingLayout";

export default function Landing() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Sports Facility Booking System
            </p>

            <h2 className="text-5xl font-black leading-tight md:text-7xl">
              Your Court. Your Game. Your Schedule.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Book facilities, request coaching sessions, view available sports
              products, and receive real-time updates in one system.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white hover:bg-[#B87463]"
              >
                Start Booking
              </Link>

              <Link
                to="/facilities"
                className="rounded-2xl border border-[#DED8D2] bg-white px-8 py-4 font-black"
              >
                Explore Facilities
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[40px] border border-[#DED8D2] bg-white p-4 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1400&auto=format&fit=crop"
              alt="Sports court"
              className="h-[520px] w-full rounded-[32px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 pb-20 md:grid-cols-4">
        {[
          ["3+", "Facilities"],
          ["24/7", "Online Booking"],
          ["Real-time", "Notifications"],
          ["Staff", "Approval"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-[28px] border border-[#DED8D2] bg-white p-6 text-center shadow-sm"
          >
            <h3 className="text-3xl font-black text-[#C97B6C]">{value}</h3>
            <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </section>
    </LandingLayout>
  );
}