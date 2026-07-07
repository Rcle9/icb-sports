// src/pages/public/Facilities.jsx

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Table2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import pickleballImage from "../../assets/landing/pickleball.jpg";
import basketballImage from "../../assets/landing/basketball.jpg";
import tableTennisImage from "../../assets/landing/table-tennis.jpg";

const mainFacilities = [
  {
    title: "Pickleball Courts",
    subtitle: "Your Court. Your Game.",
    description:
      "Enjoy multiple pickleball courts for recreational play, drills, practice, and competitive matches.",
    image: pickleballImage,
    badge: "8 Courts",
    details: [
      "4 standard silica pickleball courts",
      "3 rubberized pickleball courts",
      "1 training and drills court",
      "Good for beginners and regular players",
    ],
    icon: Trophy,
  },
  {
    title: "Basketball Court",
    subtitle: "Bring your squad.",
    description:
      "Reserve court time for team practice, friendly games, and active basketball sessions.",
    image: basketballImage,
    badge: "Team Play",
    details: [
      "Open court for group games",
      "Good for team practice",
      "Friendly match-ready area",
      "Great for casual and active players",
    ],
    icon: Users,
  },
  {
    title: "Table Tennis",
    subtitle: "Fast rallies. Fun games.",
    description:
      "Play table tennis for recreation, practice, and fast-paced games with friends or other players.",
    image: tableTennisImage,
    badge: "Indoor Play",
    details: [
      "Indoor recreational play",
      "Good for quick games",
      "Open for different skill levels",
      "Fun activity for friends and visitors",
    ],
    icon: Table2,
  },
];

const extraFacilities = [
  {
    title: "Gym",
    text: "Fitness and strength area for training and active lifestyle goals.",
    icon: Dumbbell,
  },
  {
    title: "Wall Climbing",
    text: "A fun activity for visitors who want challenge and adventure.",
    icon: Zap,
  },
  {
    title: "Billiards",
    text: "Recreational game area for friends and casual visitors.",
    icon: Sparkles,
  },
  {
    title: "Pickleball Equipment",
    text: "Equipment support for players who need basic pickleball items.",
    icon: ShieldCheck,
  },
];

const bookingSteps = [
  {
    title: "Select facility",
    text: "Choose the sport or facility you want to reserve.",
  },
  {
    title: "Pick date and time",
    text: "Check available time slots from the booking calendar.",
  },
  {
    title: "Submit booking",
    text: "Confirm your selected schedule and submit your request.",
  },
  {
    title: "Wait for approval",
    text: "Staff reviews your booking and payment proof before approval.",
  },
];

const stats = [
  ["8", "Pickleball Courts"],
  ["1", "Basketball Court"],
  ["Gym", "Fitness Area"],
  ["Open", "Sports Venue"],
];

export default function Facilities() {
  return (
    <LandingLayout>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-[#0B1F33] text-white">
        <img
          src={heroImage}
          alt="InCredoBall facilities"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/90 to-[#0B1F33]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(201,123,108,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.13),transparent_25%)]" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute left-[-130px] top-16 h-[420px] w-[420px] rounded-full border-[28px] border-white" />
          <div className="absolute bottom-[-160px] right-[-150px] h-[520px] w-[520px] rounded-full border-[34px] border-white" />
          <div className="absolute left-[52%] top-0 h-full w-px bg-white" />
        </div>

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-6 py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#E8A093] backdrop-blur">
              <Trophy size={15} />
              InCredoBall Facilities
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Facilities built for
              <span className="block text-[#E8A093]">all-out action.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/78">
              Explore pickleball courts, basketball, table tennis, gym access,
              and other recreational services in one sports venue located in
              Dumaguete City.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-[0_16px_35px_rgba(201,123,108,0.32)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
              >
                Book a Facility
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Visit Location
              </Link>
            </div>
          </div>

          <div className="mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-center backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
              >
                <h3 className="text-3xl font-black text-[#E8A093]">{value}</h3>

                <p className="mt-2 text-xs font-bold text-white/65">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute left-[-140px] top-24 h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Main Facilities
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-6xl">
                Choose your sport.
              </h2>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                Each facility is designed for players, groups, and visitors who
                want a simple way to play, train, and enjoy sports.
              </p>
            </div>

            <div className="rounded-3xl border border-[#DED8D2] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Booking Ready
                  </p>

                  <p className="text-sm font-black text-[#0B1F33]">
                    Online reservations available
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            {mainFacilities.map((facility, index) => {
              const Icon = facility.icon;
              const reversed = index % 2 === 1;

              return (
                <article
                  key={facility.title}
                  className="overflow-hidden rounded-[38px] border border-[#DED8D2] bg-white shadow-sm transition hover:border-[#C97B6C]/40 hover:shadow-2xl"
                >
                  <div
                    className={`grid gap-0 lg:grid-cols-2 ${
                      reversed ? "lg:[&>*:first-child]:order-2" : ""
                    }`}
                  >
                    <div className="relative min-h-[440px] overflow-hidden bg-[#0B1F33]">
                      <img
                        src={facility.image}
                        alt={facility.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33]/85 via-[#0B1F33]/25 to-transparent" />

                      <div className="absolute left-6 top-6 rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-[#C97B6C] shadow">
                        {facility.badge}
                      </div>

                      <div className="absolute bottom-6 left-6 right-6 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E8A093]">
                          {facility.subtitle}
                        </p>

                        <h3 className="mt-3 text-4xl font-black">
                          {facility.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center p-7 md:p-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                        <Icon size={25} />
                      </div>

                      <h3 className="mt-6 text-4xl font-black text-[#0B1F33]">
                        {facility.title}
                      </h3>

                      <p className="mt-4 text-base font-semibold leading-8 text-slate-600">
                        {facility.description}
                      </p>

                      <div className="mt-7 grid gap-3">
                        {facility.details.map((detail) => (
                          <div
                            key={detail}
                            className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4"
                          >
                            <CheckCircle2
                              size={18}
                              className="shrink-0 text-green-600"
                            />

                            <p className="text-sm font-bold text-[#0B1F33]">
                              {detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                          to="/register"
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
                        >
                          Reserve Now
                          <ArrowRight size={17} />
                        </Link>

                        <Link
                          to="/contact"
                          className="inline-flex items-center gap-2 rounded-2xl border border-[#DED8D2] bg-white px-7 py-4 text-sm font-black text-[#0B1F33] transition hover:-translate-y-0.5 hover:bg-[#FFF8F6]"
                        >
                          Ask Availability
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Extra Amenities
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
              More ways to enjoy your visit.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              InCredoBall Sports also provides activities and support services
              that make the venue more complete for visitors.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {extraFacilities.map((facility) => {
              const Icon = facility.icon;

              return (
                <div
                  key={facility.title}
                  className="group rounded-[30px] border border-[#DED8D2] bg-[#F5F3F1] p-7 transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C97B6C] text-white shadow-[0_12px_28px_rgba(201,123,108,0.25)] transition group-hover:bg-[#0B1F33]">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                    {facility.title}
                  </h3>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    {facility.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B1F33] px-6 py-20 text-white">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#E8A093]">
              Booking Process
            </p>

            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              Simple facility booking flow.
            </h2>

            <p className="mt-4 max-w-2xl font-semibold leading-8 text-white/70">
              Create an account, choose your preferred facility, select a date
              and time, then wait for staff confirmation.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white transition hover:bg-white hover:text-[#0B1F33]"
              >
                Create Account
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {bookingSteps.map((step, index) => (
              <div
                key={step.title}
                className="group flex gap-5 rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:text-[#0B1F33]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C97B6C] text-lg font-black text-white">
                  {index + 1}
                </div>

                <div>
                  <h3 className="text-lg font-black">{step.title}</h3>

                  <p className="mt-1 text-sm font-semibold leading-6 text-white/65 group-hover:text-slate-600">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F3F1] px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <FeatureCard
            icon={Clock}
            title="Clear Time Slots"
            text="View exact time slots before sending a booking request."
          />

          <FeatureCard
            icon={ShieldCheck}
            title="Staff Approval"
            text="Bookings and payment proofs are reviewed by staff."
          />

          <FeatureCard
            icon={MapPin}
            title="Easy Location"
            text="Visit InCredoBall Sports at E.J. Blanco Extension, Daro, Dumaguete City."
          />
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <Star size={30} />
            </div>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
              Ready to reserve your next game?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Start booking your preferred sports facility and enjoy a smoother
              reservation experience at InCredoBall Sports.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Book Now
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/contact"
                className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white transition hover:bg-white/10"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[30px] border border-[#DED8D2] bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
        <Icon size={24} />
      </div>

      <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">{title}</h3>

      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
        {text}
      </p>
    </div>
  );
}