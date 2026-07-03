import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import {
  Dumbbell,
  MapPin,
  Sparkles,
  Trophy,
  Users,
  Waves,
} from "lucide-react";

const highlights = [
  {
    title: "Sports and Recreation",
    text: "Incredoball Sports provides a space where players, families, and groups can enjoy different sports and recreational activities.",
    icon: Trophy,
  },
  {
    title: "Fitness and Training",
    text: "The facility supports active lifestyles through sports, gym access, drills, and training-friendly spaces.",
    icon: Dumbbell,
  },
  {
    title: "Community Venue",
    text: "It is a venue for players of all levels, from beginners to regular athletes, to gather, play, and improve together.",
    icon: Users,
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

export default function About() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="rounded-[40px] bg-[#2B2B2B] p-8 text-white md:p-12">
            <p className="font-black uppercase tracking-[0.25em] text-[#D88E80]">
              About Incredoball Sports
            </p>

            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
              A premier venue for sports, fitness, and entertainment in
              Dumaguete City.
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
              Incredoball Sports is a recreational and sports facility located
              at E.J. Blanco Extension, Daro, Dumaguete City. It offers a place
              where players and visitors can enjoy pickleball, basketball, table
              tennis, gym activities, billiards, wall climbing, and other
              sports-related services.
            </p>

            <div className="mt-8 flex items-start gap-3 rounded-3xl bg-white/10 p-5">
              <MapPin className="mt-1 shrink-0 text-[#D88E80]" size={24} />

              <div>
                <p className="text-sm font-black uppercase tracking-widest text-white/50">
                  Location
                </p>

                <p className="mt-1 font-semibold text-white">
                  E.J. Blanco Extension, Daro, Dumaguete City, Philippines,
                  6200
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[40px] border border-[#DED8D2] bg-white p-4 shadow-xl">
            <img
              src={heroImage}
              alt="Incredoball Sports facility"
              className="h-[520px] w-full rounded-[34px] object-cover"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[30px] border border-[#DED8D2] bg-white p-8 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#C97B6C]">
                  <Icon size={24} />
                </div>

                <h3 className="mt-5 text-2xl font-black text-[#2B2B2B]">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              What We Offer
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#2B2B2B]">
              More than one sport, more than one experience.
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              Incredoball Sports is designed for people who want to play, train,
              bond with friends, or simply enjoy an active environment. The
              facility welcomes players from different skill levels and provides
              different activities for sports, fitness, and entertainment.
            </p>
          </div>

          <div className="rounded-[32px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {facilities.map((facility) => (
                <div
                  key={facility}
                  className="flex items-center gap-3 rounded-2xl bg-[#F5F3F1] p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C97B6C] text-white">
                    {facility.includes("Gym") ? (
                      <Dumbbell size={18} />
                    ) : facility.includes("Wall") ? (
                      <Waves size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </span>

                  <p className="font-black text-[#2B2B2B]">{facility}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-[40px] bg-[#C97B6C] p-8 text-center text-white md:p-12">
          <p className="font-black uppercase tracking-[0.25em] text-white/70">
            Incredoball Sports
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black">
            A place to play, train, compete, and enjoy sports with the
            community.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/85">
            Whether you are booking a court, joining a game, working out, or
            spending time with friends, Incredoball Sports offers a complete
            venue for active recreation in Dumaguete City.
          </p>
        </div>
      </section>
    </LandingLayout>
  );
}