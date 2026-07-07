// src/pages/public/Landing.jsx

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import pickleballImage from "../../assets/landing/pickleball.jpg";
import basketballImage from "../../assets/landing/basketball.jpg";
import tableTennisImage from "../../assets/landing/table-tennis.jpg";

const sportCards = [
  {
    title: "Pickleball",
    subtitle: "Your Court. Your Game.",
    description:
      "Play on multiple pickleball courts for casual games, training drills, and competitive matches.",
    image: pickleballImage,
    badge: "8 Courts",
  },
  {
    title: "Basketball",
    subtitle: "Bring your squad.",
    description:
      "Reserve court time for team games, practice sessions, and friendly competition.",
    image: basketballImage,
    badge: "Team Play",
  },
  {
    title: "Table Tennis",
    subtitle: "Fast rallies. Fun games.",
    description:
      "Enjoy table tennis matches for recreation, practice, and quick competitive play.",
    image: tableTennisImage,
    badge: "Indoor Play",
  },
];

const facilities = [
  {
    title: "Pickleball Courts",
    count: "8 Courts",
    desc: "Multiple courts for recreational play, drills, training, and competitive matches.",
    img: pickleballImage,
    tag: "Most Popular",
  },
  {
    title: "Basketball Court",
    count: "Open Court",
    desc: "Court space for team practice, casual games, and friendly matches.",
    img: basketballImage,
    tag: "Team Play",
  },
  {
    title: "Table Tennis",
    count: "Indoor Game",
    desc: "Fast-paced table tennis area for casual and competitive players.",
    img: tableTennisImage,
    tag: "Fast Games",
  },
];

const services = [
  {
    icon: Trophy,
    title: "Pickleball Court",
    text: "Reserve courts for recreational games, drills, training, and competitive play.",
  },
  {
    icon: CalendarCheck,
    title: "Basketball Court",
    text: "Book court time for team games, practice sessions, and friendly matches.",
  },
  {
    icon: Sparkles,
    title: "Table Tennis",
    text: "Enjoy fast-paced table tennis games with friends and other players.",
  },
  {
    icon: Dumbbell,
    title: "Gym",
    text: "Access gym facilities for strength, fitness, and training goals.",
  },
];

const extraServices = [
  "Wall Climbing",
  "Pickleball Equipment",
  "Billiards",
  "Parking Available",
  "Gym",
  "Table Tennis",
  "Pickleball Court",
  "Basketball Court",
];

const steps = [
  {
    title: "Choose a sport",
    text: "Select your preferred facility from the booking page.",
  },
  {
    title: "Pick your schedule",
    text: "Check available dates and real-time time slots.",
  },
  {
    title: "Reserve your slot",
    text: "Submit your booking request and upload payment proof.",
  },
  {
    title: "Wait for approval",
    text: "Staff reviews your booking and confirms your reservation.",
  },
];

const stats = [
  ["8", "Pickleball Courts"],
  ["1", "Basketball Court"],
  ["Gym", "Fitness Area"],
  ["Open", "Sports Venue"],
];

export default function Landing() {
  return (
    <LandingLayout>
      <section className="relative isolate min-h-[calc(100vh-88px)] overflow-hidden bg-[#0B1F33] text-white">
        <img
          src={heroImage}
          alt="InCredoBall Sports Center"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/90 to-[#0B1F33]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,123,108,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.13),transparent_25%)]" />

        <div className="absolute left-0 top-0 h-full w-full opacity-[0.08]">
          <div className="absolute left-[-120px] top-20 h-[420px] w-[420px] rounded-full border-[28px] border-white" />
          <div className="absolute bottom-[-150px] right-[-150px] h-[520px] w-[520px] rounded-full border-[34px] border-white" />
          <div className="absolute left-[48%] top-0 h-full w-px bg-white" />
          <div className="absolute left-[42%] top-1/2 h-px w-[320px] bg-white" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#E8A093] backdrop-blur">
              <Sparkles size={15} />
              Dumaguete Sports Hub
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Your Court.
              <span className="block text-[#E8A093]">Your Game.</span>
              Your Schedule.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/78">
              Challenge yourself and reach new heights at InCredoBall Sports.
              Book pickleball, basketball, table tennis, and gym facilities with
              a smoother online reservation experience.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {["Pickleball", "Basketball", "Table Tennis", "Gym"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-black text-white backdrop-blur"
                  >
                    {item}
                  </span>
                )
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-[0_16px_35px_rgba(201,123,108,0.32)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
              >
                Book Now
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/facilities"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Explore Facilities
              </Link>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <MapPin className="mt-1 shrink-0 text-[#E8A093]" size={22} />

              <div>
                <p className="text-sm font-black uppercase tracking-widest text-white/45">
                  Location
                </p>

                <p className="mt-1 font-bold leading-6 text-white">
                  E.J. Blanco Extension, Daro, Dumaguete City, Philippines,
                  6200
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 z-10 hidden rounded-3xl border border-white/10 bg-white/95 p-4 text-[#0B1F33] shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Booking System
                  </p>

                  <p className="text-sm font-black">Slots Available</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-32 z-10 hidden rounded-3xl border border-white/10 bg-white/95 p-4 text-[#0B1F33] shadow-xl backdrop-blur xl:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                  <Star size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Player Ready
                  </p>

                  <p className="text-sm font-black">Courts • Gym • Games</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[42px] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="relative overflow-hidden rounded-[34px]">
                <img
                  src={heroImage}
                  alt="InCredoBall Sports facility"
                  className="h-[560px] w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33]/80 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E8A093]">
                    Featured Sports Complex
                  </p>

                  <h3 className="mt-2 text-3xl font-black text-white">
                    All-in access. All-out action.
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                    Courts, fitness, games, and recreation in one sports center.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-8 left-6 right-6 rounded-[28px] bg-white p-5 text-[#0B1F33] shadow-xl">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-[#F5F3F1] p-3 text-center"
                  >
                    <p className="text-2xl font-black text-[#C97B6C]">
                      {value}
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute left-[-140px] top-20 h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Sports Complex Experience
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-6xl">
              Play your way.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-slate-600">
              Choose your sport, reserve your court, and enjoy an active venue
              designed for players, teams, and visitors.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {sportCards.map((sport) => (
              <div
                key={sport.title}
                className="group relative min-h-[470px] overflow-hidden rounded-[34px] border border-[#DED8D2] bg-[#0B1F33] shadow-sm transition hover:-translate-y-2 hover:shadow-2xl"
              >
                <img
                  src={sport.image}
                  alt={sport.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33] via-[#0B1F33]/45 to-transparent" />

                <div className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#C97B6C] shadow">
                  {sport.badge}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#E8A093]">
                    {sport.subtitle}
                  </p>

                  <h3 className="mt-3 text-4xl font-black">{sport.title}</h3>

                  <p className="mt-3 text-sm font-semibold leading-7 text-white/75">
                    {sport.description}
                  </p>

                  <Link
                    to="/register"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-[#0B1F33]"
                  >
                    Book This Sport
                    <ChevronRight size={17} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Facilities
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
                All-in access. All-out action.
              </h2>

              <p className="mt-4 max-w-2xl font-semibold leading-8 text-slate-600">
                InCredoBall Sports offers facilities for recreation, training,
                fitness, and entertainment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-[#DED8D2] bg-[#F5F3F1] p-5 text-center transition hover:-translate-y-1 hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-xl"
                >
                  <h3 className="text-3xl font-black text-[#C97B6C]">
                    {value}
                  </h3>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {facilities.map((facility) => (
              <div
                key={facility.title}
                className="group overflow-hidden rounded-[32px] border border-[#DED8D2] bg-white shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={facility.img}
                    alt={facility.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B1F33]/85 to-transparent" />

                  <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#C97B6C] shadow-sm">
                    {facility.count}
                  </span>

                  <span className="absolute bottom-5 left-5 rounded-full bg-[#C97B6C] px-4 py-2 text-xs font-black text-white shadow">
                    {facility.tag}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black text-[#0B1F33]">
                    {facility.title}
                  </h3>

                  <p className="mt-3 min-h-[78px] text-sm font-semibold leading-6 text-slate-600">
                    {facility.desc}
                  </p>

                  <Link
                    to="/register"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1F33] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C]"
                  >
                    Reserve Facility
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B1F33] px-6 py-20 text-white">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#E8A093]">
              Services
            </p>

            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              More than just a court.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-white/70">
              From sports courts to equipment and fitness areas, InCredoBall is
              built for players, teams, and active communities.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="group rounded-[28px] border border-white/10 bg-white/10 p-7 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:text-[#0B1F33] hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C97B6C] text-white shadow-[0_12px_28px_rgba(201,123,108,0.28)] transition group-hover:scale-110">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-xl font-black">{service.title}</h3>

                  <p className="mt-3 text-sm font-semibold leading-6 text-white/65 group-hover:text-slate-600">
                    {service.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-white/10 shadow-xl backdrop-blur">
            <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="bg-[#C97B6C] p-8 text-white">
                <p className="font-black uppercase tracking-[0.25em] text-white/75">
                  Other Amenities
                </p>

                <h3 className="mt-4 text-3xl font-black">
                  Extra ways to enjoy your visit.
                </h3>

                <p className="mt-3 text-sm font-semibold leading-7 text-white/80">
                  More options are available for players, friends, teams, and
                  visitors.
                </p>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-3">
                  {extraServices.map((service) => (
                    <span
                      key={service}
                      className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#F5F3F1] px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[40px] bg-white p-8 shadow-2xl md:p-10">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#C97B6C]/15 blur-3xl" />

            <div className="relative">
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Online Booking
              </p>

              <h2 className="mt-4 text-4xl font-black text-[#0B1F33]">
                Reserve your preferred facility with ease.
              </h2>

              <p className="mt-4 font-semibold leading-8 text-slate-600">
                The system allows users to check facility availability, reserve
                time slots, upload payment proof, and receive booking updates.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <InfoBadge icon={CalendarCheck} text="Facility Booking" />
                <InfoBadge icon={Bell} text="Real-time Updates" />
                <InfoBadge icon={ShieldCheck} text="Staff Approval" />
                <InfoBadge icon={Users} text="Walk-in Support" />
              </div>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 font-black text-white transition hover:bg-[#0B1F33]"
              >
                Create Account
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="group flex items-center gap-5 rounded-[24px] border border-[#DED8D2] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#C97B6C]/40 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B1F33] text-lg font-black text-white transition group-hover:bg-[#C97B6C]">
                  {index + 1}
                </div>

                <div>
                  <h3 className="text-lg font-black text-[#0B1F33]">
                    {step.title}
                  </h3>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <FeatureStrip
            icon={Zap}
            title="Fast Scheduling"
            text="Check available slots and book without manual back-and-forth."
          />

          <FeatureStrip
            icon={Clock}
            title="Clear Time Slots"
            text="See exact booking times before submitting a reservation."
          />

          <FeatureStrip
            icon={ShieldCheck}
            title="Staff Verification"
            text="Payment and booking requests are reviewed by staff."
          />
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <PlayCircle size={30} />
            </div>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
              Ready to play at InCredoBall Sports?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Create an account and start booking your preferred sports facility
              with real-time availability and staff approval.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Book a Facility
              </Link>

              <Link
                to="/contact"
                className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white transition hover:bg-white/10"
              >
                Visit Location
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function InfoBadge({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4 transition hover:bg-white">
      <Icon className="text-[#C97B6C]" size={20} />

      <span className="text-sm font-black text-[#0B1F33]">{text}</span>
    </div>
  );
}

function FeatureStrip({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[28px] border border-[#DED8D2] bg-[#F5F3F1] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
        <Icon size={22} />
      </div>

      <h3 className="mt-5 text-xl font-black text-[#0B1F33]">{title}</h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}