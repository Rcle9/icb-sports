import { Link } from "react-router-dom";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Trophy,
} from "lucide-react";
import LandingLayout from "./LandingLayout";

const GOOGLE_MAP_LINK =
  "https://www.google.com/maps/place/Incredoball+Sports+and+Development+Center/@9.3199684,123.2925082,17.75z/data=!4m6!3m5!1s0x33ab6febb3194d2f:0x3132e37cfcf92748!8m2!3d9.3197064!4d123.2933125!16s%2Fg%2F11fll2bjx1?entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D";

const services = [
  "Pickleball Court",
  "Basketball Court",
  "Table Tennis",
  "Gym",
  "Billiards",
  "Wall Climbing",
  "Pickleball Equipment",
  "Parking Available",
];

export default function Contact() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
            Contact
          </p>

          <h2 className="mt-3 max-w-4xl text-4xl font-black text-[#2B2B2B] md:text-5xl">
            Visit InCredoBall Sports in Dumaguete City.
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            InCredoBall Sports is your premier venue for sports, fitness, and
            entertainment. Visit the facility, check available sports services,
            or create an account to start booking online.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[40px] bg-[#2B2B2B] p-8 text-white md:p-10">
            <p className="font-black uppercase tracking-[0.25em] text-[#D88E80]">
              Facility Information
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Ready to play, train, and have fun?
            </h2>

            <p className="mt-5 leading-8 text-white/80">
              Visit InCredoBall Sports for pickleball, basketball, table tennis,
              gym activities, billiards, wall climbing, and other sports and
              recreation services.
            </p>

            <div className="mt-10 space-y-5">
              <InfoCard
                icon={MapPin}
                label="Address"
                value="E.J. Blanco Extension, Daro, Dumaguete City, Negros Oriental, Philippines, 6200"
              />

              <InfoCard
                icon={Mail}
                label="Email"
                value="incredoballsportsdev@gmail.com"
              />

              <InfoCard icon={Clock} label="Availability" value="Open Daily" />

              <InfoCard
                icon={MessageCircle}
                label="Facebook"
                value="InCredoBall Sports"
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={GOOGLE_MAP_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-[#2B2B2B] transition hover:bg-[#F5F3F1]"
              >
                <Navigation size={18} />
                Open Map
              </a>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 font-black text-white transition hover:bg-[#B87463]"
              >
                <Trophy size={18} />
                Book Facility
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[40px] border border-[#DED8D2] bg-white shadow-sm">
            <div className="border-b border-[#DED8D2] p-6">
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Location Map
              </p>

              <h3 className="mt-3 text-3xl font-black text-[#2B2B2B]">
                InCredoBall Sports and Development Center
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Located at E.J. Blanco Extension, Daro, Dumaguete City. Use the
                map below to find the facility.
              </p>
            </div>

            <div className="h-[520px] w-full">
              <iframe
                title="InCredoBall Sports Location"
                src="https://www.google.com/maps?q=9.3197064,123.2933125&z=18&output=embed"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[36px] border border-[#DED8D2] bg-white p-8 shadow-sm">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Services
            </p>

            <h3 className="mt-3 text-3xl font-black text-[#2B2B2B]">
              Sports, fitness, and entertainment in one venue.
            </h3>

            <p className="mt-4 leading-8 text-slate-600">
              InCredoBall Sports offers different activities for players,
              groups, and visitors who want an active and enjoyable experience.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {services.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-[#DED8D2] bg-[#F5F3F1] px-5 py-3 text-sm font-black text-[#2B2B2B]"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] bg-[#C97B6C] p-8 text-white shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Phone size={26} />
            </div>

            <h3 className="mt-5 text-3xl font-black">
              Need help with booking?
            </h3>

            <p className="mt-4 leading-8 text-white/85">
              Create an account to book online, or visit the facility directly
              for assistance with schedules, sports services, and available
              activities.
            </p>

            <Link
              to="/register"
              className="mt-7 inline-flex rounded-2xl bg-white px-7 py-4 font-black text-[#C97B6C]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#D88E80]">
        <Icon size={22} />
      </div>

      <div>
        <p className="text-sm font-black uppercase tracking-widest text-white/50">
          {label}
        </p>

        <p className="mt-2 text-base font-semibold leading-7 text-white">
          {value}
        </p>
      </div>
    </div>
  );
}