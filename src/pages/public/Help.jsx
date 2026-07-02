import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  CreditCard,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Trophy,
  UserPlus,
} from "lucide-react";
import LandingLayout from "./LandingLayout";

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
  "Create an account or log in",
  "Choose Pickleball, Basketball, or Table Tennis",
  "Select an available court/table time slot",
  "Submit your reservation",
  "Upload payment proof",
  "Wait for staff approval",
];

export default function Help() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Help Center
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black text-[#2B2B2B] md:text-5xl">
              Need help with booking at InCredoBall Sports?
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Find quick answers about facility reservations, payment proof,
              staff approval, and visiting InCredoBall Sports in Dumaguete City.
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
                className="rounded-2xl bg-[#C97B6C] px-7 py-4 font-black text-white shadow-sm transition hover:bg-[#B87463]"
              >
                Create Account
              </Link>

              <Link
                to="/contact"
                className="rounded-2xl border border-[#DED8D2] bg-white px-7 py-4 font-black text-[#2B2B2B] shadow-sm transition hover:bg-[#F5F3F1]"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="rounded-[40px] bg-[#2B2B2B] p-8 text-white md:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#D88E80]">
              <HelpCircle size={28} />
            </div>

            <h2 className="mt-5 text-4xl font-black">Booking Guide</h2>

            <p className="mt-4 leading-8 text-white/75">
              Follow these steps to reserve a sports facility online.
            </p>

            <div className="mt-8 space-y-4">
              {bookingSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl bg-white/10 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C97B6C] text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <p className="font-bold text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {faqs.map((faq) => {
            const Icon = faq.icon;

            return (
              <div
                key={faq.question}
                className="rounded-[28px] border border-[#DED8D2] bg-white p-7 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#C97B6C]">
                  <Icon size={24} />
                </div>

                <h2 className="mt-5 text-xl font-black text-[#2B2B2B]">
                  {faq.question}
                </h2>

                <p className="mt-3 leading-7 text-slate-600">{faq.answer}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-[40px] bg-[#C97B6C] p-8 text-center text-white md:p-12">
          <h2 className="mx-auto max-w-3xl text-4xl font-black">
            Still need assistance?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/85">
            Visit InCredoBall Sports directly or go to the contact page for
            location details and facility information.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C]"
            >
              View Contact Page
            </Link>

            <Link
              to="/facilities"
              className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white hover:bg-white/10"
            >
              View Facilities
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}