import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/logo.jpg";

export default function LandingLayout({ children }) {
  return (
    <main className="flex min-h-screen flex-col bg-[#F5F3F1] text-[#2B2B2B]">
      <nav className="sticky top-0 z-50 border-b border-[#DED8D2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="InCredoBall"
              className="h-12 w-12 rounded-2xl object-cover shadow"
            />
            <div>
              <h1 className="text-xl font-black">InCredoBall</h1>
              <p className="text-xs text-slate-500">Sports Management</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold md:flex">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/about">About</NavItem>
            <NavItem to="/facilities">Facility</NavItem>
            <NavItem to="/shop">Products</NavItem>
            <NavItem to="/contact">Contact</NavItem>
          </div>

          <div className="flex gap-3">
            <Link
              to="/login"
              className="rounded-2xl border border-[#DED8D2] px-5 py-3 font-bold"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-2xl bg-[#C97B6C] px-5 py-3 font-bold text-white hover:bg-[#B87463]"
            >
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="mt-auto bg-[#2B2B2B] px-6 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-2xl font-black">InCredoBall</h3>
            <p className="mt-3 text-white/70">
              Sports Facility Management System
            </p>
          </div>

          <div>
            <h4 className="font-black">Website</h4>
            <div className="mt-3 space-y-2 text-white/70">
              <Link to="/" className="block hover:text-white">
                Home
              </Link>
              <Link to="/about" className="block hover:text-white">
                About
              </Link>
              <Link to="/facilities" className="block hover:text-white">
                Facility
              </Link>
              <Link to="/shop" className="block hover:text-white">
                Products
              </Link>
              <Link to="/contact" className="block hover:text-white">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-black">System Features</h4>
            <div className="mt-3 space-y-2 text-white/70">
              <p>Facility Booking</p>
              <p>Coaching Sessions</p>
              <p>Product Display</p>
              <p>Real-time Notifications</p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-white/50">
          © 2026 InCredoBall Sports Management. All rights reserved.
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
        isActive ? "text-[#C97B6C]" : "text-slate-700 hover:text-[#C97B6C]"
      }
    >
      {children}
    </NavLink>
  );
}