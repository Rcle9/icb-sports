import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Dumbbell,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import pickleballImage from "../../assets/landing/pickleball.jpg";
import basketballImage from "../../assets/landing/basketball.jpg";
import tableTennisImage from "../../assets/landing/table-tennis.jpg";

const facilities = [
  {
    title: "Pickleball Courts",
    count: "8 Courts",
    desc: "4 standard silica pickleball courts, 3 rubberized pickleball courts, and 1 training/drills court for all skill levels.",
    img: pickleballImage,
  },
  {
    title: "Basketball Court",
    count: "Open Court",
    desc: "Bring your squad and enjoy basketball games, training sessions, and friendly matches anytime.",
    img: basketballImage,
  },
  {
    title: "Table Tennis",
    count: "All Players",
    desc: "Play, rally, and have fun with table tennis facilities open for casual and competitive players.",
    img: tableTennisImage,
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
    text: "Select Pickleball, Basketball, or Table Tennis from the booking page.",
  },
  {
    title: "Check the schedule",
    text: "View real-time availability for each exact court or table.",
  },
  {
    title: "Pick your time slot",
    text: "Click open time slots and reserve your preferred schedule.",
  },
  {
    title: "Submit reservation",
    text: "Upload payment proof and wait for staff approval.",
  },
];

export default function Landing() {
  return (
    <LandingLayout>
      <section className="relative overflow-hidden bg-[#F5F3F1]">
        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DED8D2] bg-white px-4 py-2 text-sm font-black text-[#C97B6C] shadow-sm">
              <Trophy size={16} />
              Incredoball Sports
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-[#2B2B2B] md:text-7xl">
              Your premier venue for
              <span className="block text-[#C97B6C]">
                sports, fitness, and entertainment.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Challenge yourself and reach new heights at Incredoball Sports.
              Book facilities online, view available schedules, and enjoy a
              complete sports experience in Dumaguete City.
            </p>

            <div className="mt-6 flex items-start gap-3 rounded-3xl border border-[#DED8D2] bg-white p-5 shadow-sm">
              <MapPin className="mt-1 shrink-0 text-[#C97B6C]" size={22} />
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Location
                </p>
                <p className="mt-1 font-bold text-[#2B2B2B]">
                  E.J. Blanco Extension, Daro, Dumaguete City, Philippines,
                  6200
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-sm transition hover:bg-[#B87463]"
              >
                Start Booking
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/facilities"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#DED8D2] bg-white px-8 py-4 font-black text-[#2B2B2B] shadow-sm transition hover:bg-[#F8F5F3]"
              >
                Explore Facilities
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["8", "Pickleball Courts"],
                ["1", "Basketball Court"],
                ["Gym", "Fitness Area"],
                ["Open", "Daily"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-[#DED8D2] bg-white p-4 text-center shadow-sm"
                >
                  <h3 className="text-2xl font-black text-[#C97B6C]">
                    {value}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[42px] border border-[#DED8D2] bg-white p-4 shadow-2xl">
              <img
  src={heroImage}
  alt="Incredoball Sports facility"
  className="h-[520px] w-full rounded-[34px] object-cover"
/>
            </div>

            <div className="absolute -bottom-6 left-6 right-6 rounded-[28px] bg-[#2B2B2B] p-5 text-white shadow-xl">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">
                Featured Sports
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {["Pickleball", "Basketball", "Table Tennis", "Gym"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Facilities
            </p>
            <h2 className="mt-3 text-4xl font-black text-[#2B2B2B]">
              Play, train, and have fun
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Incredoball Sports offers facilities for recreation, training,
              fitness, and entertainment.
            </p>
          </div>

          <Link
            to="/facilities"
            className="rounded-2xl border border-[#DED8D2] bg-white px-6 py-3 font-black text-[#2B2B2B] shadow-sm transition hover:bg-[#F8F5F3]"
          >
            View All Facilities
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {facilities.map((facility) => (
            <div
              key={facility.title}
              className="group overflow-hidden rounded-[32px] border border-[#DED8D2] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={facility.img}
                  alt={facility.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#C97B6C] shadow-sm">
                  {facility.count}
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  {facility.title}
                </h3>

                <p className="mt-3 min-h-[96px] text-sm leading-6 text-slate-600">
                  {facility.desc}
                </p>

                <Link
                  to="/register"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C]"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Services
            </p>
            <h2 className="mt-3 text-4xl font-black text-[#2B2B2B]">
              More than just a court
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              From sports courts to equipment and fitness areas, Incredoball is
              built for players, teams, and active communities.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="rounded-[28px] border border-[#DED8D2] bg-[#F5F3F1] p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C97B6C] text-white">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-[#2B2B2B]">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {service.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-[32px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <p className="mb-4 font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Other Amenities
            </p>

            <div className="flex flex-wrap gap-3">
              {extraServices.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-[#DED8D2] bg-[#F5F3F1] px-5 py-3 text-sm font-black text-[#2B2B2B]"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-[40px] bg-[#2B2B2B] p-8 text-white md:p-10">
            <p className="font-black uppercase tracking-[0.25em] text-[#D88E80]">
              Online Booking
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Reserve your preferred facility with ease.
            </h2>

            <p className="mt-4 leading-8 text-white/70">
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
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-[#2B2B2B]"
            >
              Create Account
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex items-center gap-5 rounded-[24px] border border-[#DED8D2] bg-white p-5 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-lg font-black text-[#C97B6C]">
                  {index + 1}
                </div>

                <div>
                  <h3 className="text-lg font-black text-[#2B2B2B]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[40px] bg-[#C97B6C] p-8 text-center text-white md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
            <Trophy size={30} />
          </div>

          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
            Ready to play at Incredoball Sports?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/85">
            Create an account and start booking your preferred sports facility
            with real-time availability and staff approval.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C]"
            >
              Book Now
            </Link>

            <Link
              to="/contact"
              className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white hover:bg-white/10"
            >
              Visit Location
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function InfoBadge({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <Icon className="text-[#D88E80]" size={20} />
      <span className="text-sm font-black text-white">{text}</span>
    </div>
  );
}