import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "../../assets/ICBLOGO.jpg";

export default function LandingLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F5F3F1] text-[#2B2B2B]">
      <nav className="sticky top-0 z-50 border-b border-[#DED8D2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 items-center gap-3"
          >
            <img
              src={logo}
              alt="InCredoBall"
              className="h-12 w-12 shrink-0 rounded-full object-cover shadow"
            />

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black">InCredoBall</h1>
              <p className="truncate text-xs font-semibold text-slate-500">
                Sports & Recreation
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold lg:flex">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/about">About</NavItem>
            <NavItem to="/facilities">Facility</NavItem>
            <NavItem to="/shop">Products</NavItem>
            <NavItem to="/contact">Contact</NavItem>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold transition hover:bg-[#F5F3F1]"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="rounded-2xl bg-[#C97B6C] px-5 py-3 font-bold text-white transition hover:bg-[#B87463]"
            >
              Book Now
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DED8D2] text-[#2B2B2B] lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#DED8D2] bg-white px-6 py-5 lg:hidden">
            <div className="space-y-2">
              <MobileNavItem to="/" onClick={closeMobileMenu}>
                Home
              </MobileNavItem>

              <MobileNavItem to="/about" onClick={closeMobileMenu}>
                About
              </MobileNavItem>

              <MobileNavItem to="/facilities" onClick={closeMobileMenu}>
                Facility
              </MobileNavItem>

              <MobileNavItem to="/shop" onClick={closeMobileMenu}>
                Products
              </MobileNavItem>

              <MobileNavItem to="/contact" onClick={closeMobileMenu}>
                Contact
              </MobileNavItem>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="rounded-2xl border border-[#DED8D2] px-5 py-3 text-center font-bold transition hover:bg-[#F5F3F1]"
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="rounded-2xl bg-[#C97B6C] px-5 py-3 text-center font-bold text-white transition hover:bg-[#B87463]"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="mt-auto bg-[#2B2B2B] px-6 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="InCredoBall"
                className="h-14 w-14 rounded-full object-cover shadow"
              />

              <div>
                <h3 className="text-2xl font-black">InCredoBall</h3>
                <p className="text-sm font-semibold text-white/60">
                  Sports & Recreation
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md leading-7 text-white/70">
              Your premier venue for sports, fitness, and entertainment in
              Dumaguete City. Play, train, compete, and enjoy different
              activities in one facility.
            </p>

            <p className="mt-4 text-sm font-semibold text-white/60">
              E.J. Blanco Extension, Daro, Dumaguete City, Philippines, 6200
            </p>
          </div>

          <div>
            <h4 className="font-black">Website</h4>

            <div className="mt-4 space-y-2 text-white/70">
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/facilities">Facility</FooterLink>
              <FooterLink to="/shop">Products</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </div>
          </div>

          <div>
            <h4 className="font-black">Facility Services</h4>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/70">
              <p>Pickleball Court</p>
              <p>Basketball Court</p>
              <p>Table Tennis</p>
              <p>Gym</p>
              <p>Billiards</p>
              <p>Wall Climbing</p>
              <p>Pickleball Equipment</p>
              <p>Parking Available</p>
            </div>

            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">
                Contact Email
              </p>

              <p className="mt-2 break-words text-sm font-bold text-white">
                incredoballsportsdev@gmail.com
              </p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-white/50">
          © 2026 InCredoBall Sports. All rights reserved.
        </p>
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
        isActive
          ? "text-[#C97B6C]"
          : "text-slate-700 hover:text-[#C97B6C]"
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
    <Link to={to} className="block hover:text-white">
      {children}
    </Link>
  );
}