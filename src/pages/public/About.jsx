import LandingLayout from "./LandingLayout";

export default function About() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[40px] bg-[#2B2B2B] p-10 text-white md:p-14">
          <p className="font-black uppercase tracking-[0.25em] text-[#D88E80]">
            About InCredoBall
          </p>

          <h2 className="mt-4 max-w-4xl text-4xl font-black md:text-5xl">
            A modern sports center management system for booking, coaching, maintenance, and operations.
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
            InCredoBall helps users book facilities, request coaching sessions, buy merchandise, and receive real-time updates.
            Staff can manage bookings, coaches, inventory, maintenance requests, and activity logs.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Easy Booking", "Users can check availability and send booking requests."],
            ["Staff Approval", "Staff can approve, reject, or monitor pending requests."],
            ["Real-time Updates", "Notifications update users and staff instantly."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[30px] border border-[#DED8D2] bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-3 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </LandingLayout>
  );
}