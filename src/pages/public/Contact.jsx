import { Link } from "react-router-dom";
import LandingLayout from "./LandingLayout";

export default function Contact() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
            Contact
          </p>

          <h2 className="mt-3 text-5xl font-black">
            Visit InCredoBall Sports Center
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Book facilities and manage your sports activities through the
            InCredoBall Sports Management System.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[40px] bg-[#C97B6C] p-10 text-white">
            <p className="font-black uppercase tracking-[0.25em] text-white/80">
              Contact Information
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Ready to play your next game?
            </h2>

            <p className="mt-5 leading-8 text-white/90">
              Create an account and start booking facilities online with
              real-time notifications and staff approval.
            </p>

            <div className="mt-10 space-y-5">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-widest text-white/70">
                  Address
                </p>

                <p className="mt-2 text-lg font-semibold">
                  Dumaguete City, Negros Oriental, Philippines
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-widest text-white/70">
                  System Features
                </p>

                <div className="mt-3 space-y-2 text-white/90">
                  <p>• Facility Booking</p>
                  <p>• Product Display</p>
                  <p>• Maintenance Tracking</p>
                  <p>• Inventory Management</p>
                  <p>• Real-time Notifications</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-widest text-white/70">
                  Availability
                </p>

                <p className="mt-2 text-lg font-semibold">
                  Open Daily • 8:00 AM - 10:00 PM
                </p>
              </div>
            </div>

            <Link
              to="/register"
              className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C]"
            >
              Create Account
            </Link>
          </div>

          <div className="overflow-hidden rounded-[40px] border border-[#DED8D2] bg-white shadow-sm">
            <div className="border-b border-[#DED8D2] p-6">
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Location Map
              </p>

              <h3 className="mt-3 text-3xl font-black">
                InCredoBall Sports Center
              </h3>

              <p className="mt-3 text-slate-600">
                Locate the sports center and visit the facilities directly.
              </p>
            </div>

            <div className="h-[500px] w-full">
              <iframe
                title="InCredoBall Location"
                src="https://www.google.com/maps?q=Incredoball+Sports+and+Development+Center+Dumaguete&output=embed"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}