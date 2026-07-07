// src/pages/public/Help.jsx

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";

const faqs = [
  {
    icon: CalendarCheck,
    question: "How do I book a facility?",
    answer:
      "Create an account or log in, go to the booking page, choose a sport, select an available court or table schedule, and reserve your preferred time slot.",
  },
  {
    icon: Trophy,
    question: "What facilities can I book?",
    answer:
      "The online booking system focuses on Pickleball, Basketball, and Table Tennis. Other facility services such as gym, billiards, wall climbing, equipment, and parking are shown for information and visitor reference.",
  },
  {
    icon: CreditCard,
    question: "Do I need to upload payment proof?",
    answer:
      "Yes. After reserving a slot, upload your payment proof so the staff can review and verify your booking request.",
  },
  {
    icon: ShieldCheck,
    question: "How does approval work?",
    answer:
      "After submitting your reservation and payment proof, staff will review the request. Once approved, your booking will be marked as confirmed.",
  },
  {
    icon: Clock,
    question: "Can I book past dates or past time slots?",
    answer:
      "No. Past dates and past time slots are blocked to keep the facility schedule accurate and organized.",
  },
  {
    icon: UserPlus,
    question: "Can walk-in customers still book?",
    answer:
      "Yes. Staff can create walk-in bookings directly from the staff dashboard for customers who visit the facility in person.",
  },
];

const bookingSteps = [
  {
    title: "Create account",
    text: "Register as a customer or log in to your existing account.",
    icon: UserPlus,
  },
  {
    title: "Choose facility",
    text: "Select Pickleball, Basketball, or Table Tennis from the booking page.",
    icon: Trophy,
  },
  {
    title: "Pick schedule",
    text: "Choose your preferred date, court/table, and available time slot.",
    icon: CalendarCheck,
  },
  {
    title: "Upload payment proof",
    text: "Submit your reservation details and upload your payment proof.",
    icon: CreditCard,
  },
  {
    title: "Wait for staff approval",
    text: "Staff will review your request and update your booking status.",
    icon: ShieldCheck,
  },
];

const supportCards = [
  {
    title: "Booking Concerns",
    text: "Questions about reservations, available slots, or booking status.",
    icon: CalendarCheck,
  },
  {
    title: "Payment Proof",
    text: "Questions about uploading or verifying payment proof.",
    icon: CreditCard,
  },
  {
    title: "Facility Visit",
    text: "Questions about location, visit reminders, and available services.",
    icon: MapPin,
  },
];

const reminders = [
  "Check your selected date and time before submitting.",
  "Make sure your payment proof is clear before uploading.",
  "Wait for staff approval before treating your booking as confirmed.",
  "Arrive earlier than your scheduled booking time.",
];

export default function Help() {
  return (
    <LandingLayout>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-[#0B1F33] text-white">
        <img
          src={heroImage}
          alt="InCredoBall Sports help center"
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
              <HelpCircle size={15} />
              Help Center
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Need help?
              <span className="block text-[#E8A093]">Book smarter.</span>
              Play easier.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/78">
              Find quick answers about facility reservations, payment proof,
              staff approval, walk-in bookings, and visiting InCredoBall Sports
              in Dumaguete City.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-[0_16px_35px_rgba(201,123,108,0.32)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
              >
                Create Account
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Contact Staff
              </Link>
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[30px] bg-white p-6 text-[#0B1F33] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#F3E4DF] text-[#B86658]">
                  <Sparkles size={30} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                    Quick Guide
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Online Booking Steps
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    Follow the process below to reserve a facility and wait for
                    staff confirmation.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {bookingSteps.slice(0, 4).map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B1F33] text-white">
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          Step {index + 1}
                        </p>

                        <p className="text-sm font-black text-[#0B1F33]">
                          {step.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              Booking Guide
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-6xl">
              How to book a facility.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              The booking process is simple and organized so customers can
              reserve a facility without confusion.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {bookingSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="group relative rounded-[30px] border border-[#DED8D2] bg-white p-6 shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl"
                >
                  <div className="absolute right-5 top-5 text-5xl font-black text-[#F3E4DF]">
                    {index + 1}
                  </div>

                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C97B6C] text-white transition group-hover:bg-[#0B1F33]">
                      <Icon size={24} />
                    </div>

                    <h3 className="mt-6 text-xl font-black text-[#0B1F33]">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                      {step.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Frequently Asked Questions
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
                Quick answers for customers.
              </h2>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                These answers explain the most common questions about booking,
                payment proof, approval, and walk-in support.
              </p>
            </div>

            <div className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Support
                  </p>

                  <p className="text-sm font-black text-[#0B1F33]">
                    Booking help available
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => {
              const Icon = faq.icon;

              return (
                <div
                  key={faq.question}
                  className="group rounded-[30px] border border-[#DED8D2] bg-[#F5F3F1] p-7 transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658] transition group-hover:bg-[#C97B6C] group-hover:text-white">
                    <Icon size={25} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                    {faq.question}
                  </h3>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    {faq.answer}
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
              Customer Support
            </p>

            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              What do you need help with?
            </h2>

            <p className="mt-4 max-w-2xl font-semibold leading-8 text-white/70">
              Whether you need help with booking, payment proof, or visiting the
              sports center, you can check the guide or contact staff.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white transition hover:bg-white hover:text-[#0B1F33]"
              >
                Contact Staff
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/facilities"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                View Facilities
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {supportCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="group rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:text-[#0B1F33]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C97B6C] text-white">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-xl font-black">{card.title}</h3>

                  <p className="mt-3 text-sm font-semibold leading-6 text-white/65 group-hover:text-slate-600">
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Visit Reminders
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
              Before your scheduled game.
            </h2>

            <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              These simple reminders can help make your booking and visit
              smoother.
            </p>

            <div className="mt-8 grid gap-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder}
                  className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-white p-4 shadow-sm"
                >
                  <CheckCircle2 size={20} className="shrink-0 text-green-600" />

                  <p className="text-sm font-bold text-[#0B1F33]">
                    {reminder}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#DED8D2] bg-white p-6 shadow-sm">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Contact Info
            </p>

            <h3 className="mt-3 text-3xl font-black text-[#0B1F33]">
              Still need help?
            </h3>

            <div className="mt-6 grid gap-4">
              <InfoRow
                icon={<MapPin size={20} />}
                title="Location"
                text="E.J. Blanco Extension, Daro, Dumaguete City, Philippines, 6200"
              />

              <InfoRow
                icon={<Mail size={20} />}
                title="Email"
                text="incredoballsportsdev@gmail.com"
              />

              <InfoRow
                icon={<MessageCircle size={20} />}
                title="Support"
                text="Contact staff for booking concerns and schedule questions."
              />
            </div>

            <Link
              to="/contact"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white transition hover:bg-[#0B1F33]"
            >
              Open Contact Page
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <Users size={30} />
            </div>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
              Ready to reserve your next game?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Create your account, choose a facility, select your schedule, and
              wait for staff approval.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Create Account
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/facilities"
                className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white transition hover:bg-white/10"
              >
                View Facilities
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function InfoRow({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-[#DED8D2] bg-[#F5F3F1] p-5">
      <div className="flex gap-4">
        <span className="mt-1 shrink-0 text-[#C97B6C]">{icon}</span>

        <div>
          <h3 className="font-black text-[#0B1F33]">{title}</h3>

          <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}