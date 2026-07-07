// src/pages/public/Contact.jsx

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";

const contactCards = [
  {
    title: "Location",
    text: "E.J. Blanco Extension, Daro, Dumaguete City, Philippines, 6200",
    icon: MapPin,
  },
  {
    title: "Email",
    text: "incredoballsportsdev@gmail.com",
    icon: Mail,
  },
  {
    title: "Booking Support",
    text: "Contact staff for facility booking assistance and schedule concerns.",
    icon: MessageCircle,
  },
];

const quickInfo = [
  {
    title: "Facility Booking",
    text: "Create an account to reserve Pickleball, Basketball, and Table Tennis facilities.",
    icon: CalendarCheck,
  },
  {
    title: "Staff Verification",
    text: "Bookings and payment proofs are reviewed by staff before approval.",
    icon: ShieldCheck,
  },
  {
    title: "Sports Venue",
    text: "A place for sports, recreation, fitness, and community games.",
    icon: Trophy,
  },
];

const visitTips = [
  "Check facility availability before visiting.",
  "Arrive earlier than your scheduled booking time.",
  "Prepare your payment proof if you booked online.",
  "Contact staff for schedule concerns or booking questions.",
];

export default function Contact() {
  return (
    <LandingLayout>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-[#0B1F33] text-white">
        <img
          src={heroImage}
          alt="InCredoBall Sports contact"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/90 to-[#0B1F33]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(201,123,108,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.13),transparent_25%)]" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute left-[-130px] top-16 h-[420px] w-[420px] rounded-full border-[28px] border-white" />
          <div className="absolute bottom-[-160px] right-[-150px] h-[520px] w-[520px] rounded-full border-[34px] border-white" />
          <div className="absolute left-[52%] top-0 h-full w-px bg-white" />
        </div>

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#E8A093] backdrop-blur">
              <Sparkles size={15} />
              Contact InCredoBall Sports
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Visit.
              <span className="block text-[#E8A093]">Book.</span>
              Play.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/78">
              Need help with facility booking, schedules, or location details?
              Reach out to InCredoBall Sports and start planning your next game
              in Dumaguete City.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-[0_16px_35px_rgba(201,123,108,0.32)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
              >
                Book a Facility
                <ArrowRight size={18} />
              </Link>

              <a
                href="https://maps.app.goo.gl/hHwSoXzcNddLuhgQ7"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Open Map
                <Navigation size={18} />
              </a>
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="rounded-[30px] bg-white p-6 text-[#0B1F33] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                  <MapPin size={26} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                    Find Us
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    InCredoBall Sports
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    E.J. Blanco Extension, Daro, Dumaguete City, Philippines,
                    6200
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <ContactMiniRow
                  icon={<Mail size={18} />}
                  label="Email"
                  value="incredoballsportsdev@gmail.com"
                />

                <ContactMiniRow
                  icon={<Clock size={18} />}
                  label="Schedule"
                  value="Contact staff for current operating hours"
                />

                <ContactMiniRow
                  icon={<CalendarCheck size={18} />}
                  label="Booking"
                  value="Online booking available for registered users"
                />
              </div>

              <a
                href="https://maps.app.goo.gl/hHwSoXzcNddLuhgQ7"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1F33] px-6 py-4 text-sm font-black text-white transition hover:bg-[#C97B6C]"
              >
                Get Directions
                <Navigation size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute left-[-140px] top-24 h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Contact Details
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-6xl">
              Reach the sports center.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              Use the contact details below for booking support, facility
              questions, and location guidance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {contactCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="group rounded-[30px] border border-[#DED8D2] bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658] transition group-hover:bg-[#C97B6C] group-hover:text-white">
                    <Icon size={25} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                    {card.title}
                  </h3>

                  <p className="mt-3 break-words text-sm font-semibold leading-7 text-slate-600">
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="rounded-[38px] bg-[#0B1F33] p-8 text-white shadow-2xl md:p-10">
            <p className="font-black uppercase tracking-[0.25em] text-[#E8A093]">
              Location Map
            </p>

            <h2 className="mt-4 text-4xl font-black">Find us easily.</h2>

            <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
              InCredoBall Sports is located at E.J. Blanco Extension, Daro,
              Dumaguete City. Open the map link below to get directions from
              your location.
            </p>

            <div className="mt-8 space-y-4">
              <InfoLine
                icon={<MapPin size={20} />}
                title="Address"
                text="E.J. Blanco Extension, Daro, Dumaguete City, Philippines, 6200"
              />

              <InfoLine
                icon={<Users size={20} />}
                title="Visitors"
                text="Players, teams, families, and groups are welcome."
              />

              <InfoLine
                icon={<CalendarCheck size={20} />}
                title="Booking"
                text="Register online to reserve available facility slots."
              />
            </div>

            <a
              href="https://maps.app.goo.gl/hHwSoXzcNddLuhgQ7"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white transition hover:bg-white hover:text-[#0B1F33]"
            >
              Open Google Maps
              <Navigation size={17} />
            </a>
          </div>

          <div className="min-h-[480px] overflow-hidden rounded-[38px] border border-[#DED8D2] bg-[#F5F3F1] p-4 shadow-sm">
            <iframe
              title="InCredoBall Sports Location"
              src="https://www.google.com/maps?q=E.J.%20Blanco%20Extension%2C%20Daro%2C%20Dumaguete%20City%2C%20Philippines%206200&output=embed"
              className="h-full min-h-[450px] w-full rounded-[30px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Visit Reminder
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
                Before going to the sports center.
              </h2>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                For a smoother experience, check your booking status and prepare
                the needed information before visiting.
              </p>

              <div className="mt-8 grid gap-4">
                {visitTips.map((tip) => (
                  <div
                    key={tip}
                    className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-white p-4 shadow-sm"
                  >
                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-green-600"
                    />

                    <p className="text-sm font-bold text-[#0B1F33]">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Quick Help
              </p>

              <h3 className="mt-3 text-3xl font-black text-[#0B1F33]">
                What can we help you with?
              </h3>

              <div className="mt-6 grid gap-4">
                {quickInfo.map((info) => {
                  const Icon = info.icon;

                  return (
                    <div
                      key={info.title}
                      className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-5 transition hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-lg"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                          <Icon size={22} />
                        </div>

                        <div>
                          <h4 className="font-black text-[#0B1F33]">
                            {info.title}
                          </h4>

                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {info.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/register"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white transition hover:bg-[#0B1F33]"
              >
                Create Account
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <Send size={30} />
            </div>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
              Ready to contact or visit InCredoBall Sports?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Start with an online booking account or open the map to visit the
              sports center location.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Book Now
                <ArrowRight size={18} />
              </Link>

              <a
                href="https://maps.app.goo.gl/hHwSoXzcNddLuhgQ7"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-8 py-4 font-black text-white transition hover:bg-white/10"
              >
                Open Map
                <Navigation size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function ContactMiniRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
      <span className="mt-0.5 shrink-0 text-[#C97B6C]">{icon}</span>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-black text-[#0B1F33]">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoLine({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
      <div className="flex gap-4">
        <span className="mt-1 shrink-0 text-[#E8A093]">{icon}</span>

        <div>
          <h3 className="font-black text-white">{title}</h3>

          <p className="mt-1 text-sm font-semibold leading-6 text-white/65">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}