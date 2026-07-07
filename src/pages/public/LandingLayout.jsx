// src/pages/public/LandingLayout.jsx

import { Link, NavLink } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Globe2,
  Mail,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import logo from "../../assets/ICBLOGO.jpg";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Facilities", path: "/facilities" },
  { label: "Products", path: "/shop" },
  { label: "Contact", path: "/contact" },
];

const FACILITY_SERVICES = [
  "Pickleball Court",
  "Basketball Court",
  "Table Tennis",
  "Gym",
  "Billiards",
  "Wall Climbing",
  "Pickleball Equipment",
  "Parking Available",
];

export default function LandingLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F5F3F1] text-[#0B1F33]">
      <nav className="sticky top-0 z-50 border-b border-[#DED8D2] bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-[#C97B6C]/30 blur-md transition group-hover:bg-[#C97B6C]/45" />

              <img
                src={logo}
                alt="InCredoBall"
                className="relative h-12 w-12 shrink-0 rounded-2xl border border-[#DED8D2] bg-white object-cover shadow-sm"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-black tracking-tight text-[#0B1F33]">
                  InCredoBall
                </h1>

                <Sparkles className="hidden text-[#C97B6C] sm:block" size={16} />
              </div>

              <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Sports & Recreation
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-[#DED8D2] bg-[#F5F3F1]/70 p-1 text-sm font-black lg:flex">
            {NAV_LINKS.map((item) => (
              <NavItem key={item.path} to={item.path}>
                {item.label}
              </NavItem>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-2xl border border-[#DED8D2] bg-white px-5 py-3 text-sm font-black text-[#0B1F33] shadow-sm transition hover:-translate-y-0.5 hover:border-[#C97B6C]/40 hover:bg-[#FFF8F6]"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(201,123,108,0.25)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
            >
              Book Now
              <ArrowRight size={16} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] shadow-sm transition hover:bg-[#FFF8F6] lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#DED8D2] bg-white px-5 py-5 shadow-lg lg:hidden">
            <div className="space-y-2">
              {NAV_LINKS.map((item) => (
                <MobileNavItem
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </MobileNavItem>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="rounded-2xl border border-[#DED8D2] bg-white px-5 py-3 text-center text-sm font-black text-[#0B1F33] shadow-sm transition hover:bg-[#F5F3F1]"
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-[#B86658]"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="relative mt-auto overflow-hidden bg-[#0B1F33] px-6 py-14 text-white">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:28px_28px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.65fr_0.95fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="InCredoBall"
                className="h-14 w-14 rounded-2xl border border-white/10 bg-white object-cover shadow"
              />

              <div>
                <h3 className="text-2xl font-black">InCredoBall</h3>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Sports & Recreation
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-white/70">
              Your premier venue for sports, fitness, and entertainment in
              Dumaguete City. Play, train, compete, and enjoy different
              activities in one facility.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <FooterBadge icon={<Trophy size={16} />} text="Sports Hub" />
              <FooterBadge icon={<CalendarCheck size={16} />} text="Bookings" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-white">
              Website
            </h4>

            <div className="mt-5 space-y-3 text-sm font-semibold text-white/65">
              {NAV_LINKS.map((item) => (
                <FooterLink key={item.path} to={item.path}>
                  {item.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-white">
              Facility Services
            </h4>

            <div className="mt-5 flex flex-wrap gap-2">
              {FACILITY_SERVICES.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white/75"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-white">
              Contact
            </h4>

            <div className="mt-5 space-y-3">
              <ContactLine
                icon={<MapPin size={17} />}
                text="E.J. Blanco Extension, Daro, Dumaguete City, Philippines, 6200"
              />

              <ContactLine
                icon={<Mail size={17} />}
                text="incredoballsportsdev@gmail.com"
              />

              <ContactLine
                icon={<Phone size={17} />}
                text="Contact staff for booking assistance"
              />

              <ContactLine
                icon={<Globe2 size={17} />}
                text="Follow InCredoBall Sports online"
              />
            </div>

            <Link
              to="/register"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(201,123,108,0.24)] transition hover:bg-[#B86658]"
            >
              Start Booking
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm font-semibold text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 InCredoBall Sports. All rights reserved.</p>

          <p>Facility booking • Sports recreation • Dumaguete City</p>
        </div>
      </footer>
    </main>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-full px-5 py-2.5 transition ${
          isActive
            ? "bg-[#C97B6C] text-white shadow-sm"
            : "text-slate-600 hover:bg-white hover:text-[#C97B6C]"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function MobileNavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `block rounded-2xl px-4 py-3 text-sm font-black transition ${
          isActive
            ? "bg-[#F3E4DF] text-[#C97B6C]"
            : "text-slate-700 hover:bg-[#F5F3F1]"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="block transition hover:text-white">
      {children}
    </Link>
  );
}

function FooterBadge({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white">
      <span className="text-[#E8A093]">{icon}</span>
      {text}
    </span>
  );
}

function ContactLine({ icon, text }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <span className="mt-0.5 shrink-0 text-[#E8A093]">{icon}</span>

      <p className="break-words text-sm font-semibold leading-6 text-white/70">
        {text}
      </p>
    </div>
  );
}