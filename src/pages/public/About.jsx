// src/pages/public/About.jsx

import { Link } from "react-router-dom";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import pickleballImage from "../../assets/landing/pickleball.jpg";
import basketballImage from "../../assets/landing/basketball.jpg";
import tableTennisImage from "../../assets/landing/table-tennis.jpg";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CheckCircle2,
  Dumbbell,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Waves,
  Zap,
} from "lucide-react";

const highlights = [
  {
    title: "Sports and Recreation",
    text: "A complete venue where players, families, friends, and groups can enjoy different sports and recreational activities.",
    icon: Trophy,
    tone: "coral",
  },
  {
    title: "Fitness and Training",
    text: "A place that supports active lifestyles through sports, gym access, drills, and training-friendly spaces.",
    icon: Dumbbell,
    tone: "navy",
  },
  {
    title: "Community Venue",
    text: "A welcoming space for beginners, regular athletes, and local players to gather, play, and improve together.",
    icon: Users,
    tone: "green",
  },
];

const facilities = [
  "Pickleball Courts",
  "Basketball Court",
  "Table Tennis",
  "Gym",
  "Billiards",
  "Wall Climbing",
  "Pickleball Equipment",
  "Parking Available",
];

const values = [
  {
    icon: Target,
    title: "Purposeful Play",
    text: "We provide a space where players can train, compete, and enjoy sports with clear facility access.",
  },
  {
    icon: HeartHandshake,
    title: "Community First",
    text: "We support local players, groups, families, and visitors who want an active and friendly place to play.",
  },
  {
    icon: ShieldCheck,
    title: "Organized Facility",
    text: "Our booking system helps make schedules clearer for users, staff, and facility management.",
  },
];

const gallery = [
  {
    title: "Pickleball",
    image: pickleballImage,
    text: "Multiple courts for casual games, drills, and competitive play.",
  },
  {
    title: "Basketball",
    image: basketballImage,
    text: "Court space for team games, practice, and friendly matches.",
  },
  {
    title: "Table Tennis",
    image: tableTennisImage,
    text: "Fast and fun games for players of different skill levels.",
  },
];

const stats = [
  ["8", "Pickleball Courts"],
  ["1", "Basketball Court"],
  ["Gym", "Fitness Area"],
  ["Open", "Sports Venue"],
];

export default function About() {
  return (
    <LandingLayout>
      <section className="relative isolate overflow-hidden bg-[#F5F3F1]">
        <div className="absolute -left-40 -top-40 h-[380px] w-[380px] rounded-full bg-[#C97B6C]/20 blur-3xl" />
        <div className="absolute -bottom-44 right-[-140px] h-[420px] w-[420px] rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.05]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,#0B1F33_1px,transparent_0)] [background-size:28px_28px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[42px] bg-[#0B1F33] p-8 text-white shadow-2xl md:p-12">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C97B6C]/30 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#E8A093]">
                  <Sparkles size={15} />
                  About InCredoBall Sports
                </div>

                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                  A premier venue for sports, fitness, and entertainment in
                  Dumaguete City.
                </h1>

                <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-white/75 md:text-lg">
                  InCredoBall Sports is a recreational and sports facility
                  located at E.J. Blanco Extension, Daro, Dumaguete City. It
                  offers a place where players and visitors can enjoy
                  pickleball, basketball, table tennis, gym activities,
                  billiards, wall climbing, and other sports-related services.
                </p>

                <div className="mt-8 flex items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <MapPin className="mt-1 shrink-0 text-[#E8A093]" size={24} />

                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-white/50">
                      Location
                    </p>

                    <p className="mt-1 font-semibold leading-6 text-white">
                      E.J. Blanco Extension, Daro, Dumaguete City, Philippines,
                      6200
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
                  >
                    Start Booking
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    to="/facilities"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    View Facilities
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-10 z-10 hidden rounded-3xl border border-[#DED8D2] bg-white p-4 shadow-xl lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                    <Award size={22} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Sports Hub
                    </p>

                    <p className="text-sm font-black text-[#0B1F33]">
                      Play • Train • Enjoy
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[42px] border border-[#DED8D2] bg-white p-4 shadow-2xl">
                <img
                  src={heroImage}
                  alt="InCredoBall Sports facility"
                  className="h-[520px] w-full rounded-[34px] object-cover"
                />
              </div>

              <div className="absolute -bottom-6 left-6 right-6 rounded-[28px] bg-white p-5 shadow-xl">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-[#F5F3F1] p-3 text-center"
                    >
                      <p className="text-xl font-black text-[#C97B6C]">
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

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-[30px] border border-[#DED8D2] bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
                >
                  <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#C97B6C]/10 blur-2xl transition group-hover:bg-[#C97B6C]/20" />

                  <div className="relative">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        item.tone === "navy"
                          ? "bg-[#0B1F33] text-white"
                          : item.tone === "green"
                          ? "bg-green-100 text-green-700"
                          : "bg-[#F3E4DF] text-[#B86658]"
                      }`}
                    >
                      <Icon size={25} />
                    </div>

                    <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                What We Offer
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
                More than one sport, more than one experience.
              </h2>

              <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
                InCredoBall Sports is designed for people who want to play,
                train, bond with friends, or simply enjoy an active environment.
                The facility welcomes players from different skill levels and
                provides different activities for sports, fitness, and
                entertainment.
              </p>

              <div className="mt-8 rounded-[30px] bg-[#0B1F33] p-6 text-white">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#E8A093]">
                  Booking System
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  Clearer facility scheduling for customers and staff.
                </h3>

                <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
                  The web-based booking system helps users reserve facilities,
                  upload payment proof, and receive booking updates while staff
                  manage approvals and availability.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#DED8D2] bg-[#F5F3F1] p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                {facilities.map((facility) => (
                  <div
                    key={facility}
                    className="group flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:-translate-y-1 hover:border-[#C97B6C]/40 hover:shadow-lg"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C97B6C] text-white transition group-hover:bg-[#0B1F33]">
                      {facility.includes("Gym") ? (
                        <Dumbbell size={18} />
                      ) : facility.includes("Wall") ? (
                        <Waves size={18} />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </span>

                    <p className="font-black text-[#0B1F33]">{facility}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {gallery.map((item) => (
              <div
                key={item.title}
                className="group overflow-hidden rounded-[32px] border border-[#DED8D2] bg-white shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
              >
                <div className="h-64 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black text-[#0B1F33]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Our Values
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
              Built for active people and local players.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              InCredoBall Sports supports players, families, and groups who want
              a reliable place to enjoy sports and recreation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[30px] border border-[#DED8D2] bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <Zap size={30} />
            </div>

            <p className="mt-5 font-black uppercase tracking-[0.25em] text-white/70">
              InCredoBall Sports
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black">
              A place to play, train, compete, and enjoy sports with the
              community.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Whether you are booking a court, joining a game, working out, or
              spending time with friends, InCredoBall Sports offers a complete
              venue for active recreation in Dumaguete City.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Book a Facility
                <ArrowRight size={18} />
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