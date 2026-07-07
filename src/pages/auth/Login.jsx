// src/pages/auth/Login.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import { signInUser, signInWithGoogle } from "../../services/authService";
import logo from "../../assets/ICBLOGO.jpg";
import heroImage from "../../assets/landing/hero.jpg";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await signInUser(form.email.trim(), form.password);

      navigate("/home", { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Unable to log in. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError("");
      setGoogleLoading(true);

      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google login failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#F5F3F1] text-[#0B1F33] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0B1F33] text-white lg:block">
        <img
          src={heroImage}
          alt="InCredoBall Sports"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/92 to-[#0B1F33]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,123,108,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.13),transparent_25%)]" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute left-[-130px] top-16 h-[420px] w-[420px] rounded-full border-[28px] border-white" />
          <div className="absolute bottom-[-160px] right-[-150px] h-[520px] w-[520px] rounded-full border-[34px] border-white" />
          <div className="absolute left-[52%] top-0 h-full w-px bg-white" />
        </div>

        <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="flex w-fit items-center gap-3">
            <img
              src={logo}
              alt="InCredoBall"
              className="h-14 w-14 rounded-2xl border border-white/10 bg-white object-cover shadow-lg"
            />

            <div>
              <h1 className="text-2xl font-black">InCredoBall</h1>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                Sports & Recreation
              </p>
            </div>
          </Link>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#E8A093] backdrop-blur">
              <Sparkles size={15} />
              Welcome Back
            </div>

            <h2 className="mt-7 text-6xl font-black leading-[0.98] tracking-tight xl:text-7xl">
              Log in.
              <span className="block text-[#E8A093]">Book faster.</span>
              Play sooner.
            </h2>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/75">
              Access your InCredoBall account to book facilities, check your
              reservations, view notifications, and manage your sports schedule.
            </p>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
              <HeroStat value="Live" label="Booking" />
              <HeroStat value="Staff" label="Approval" />
              <HeroStat value="Sports" label="Facility" />
            </div>
          </div>

          <div className="grid max-w-3xl grid-cols-3 gap-4">
            <FeatureCard icon={Trophy} title="Book" text="Reserve facilities" />
            <FeatureCard icon={ShieldCheck} title="Track" text="View status" />
            <FeatureCard icon={UserPlus} title="Play" text="Enjoy your game" />
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/15 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 h-96 w-96 rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative w-full max-w-[520px]">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <img
                src={logo}
                alt="InCredoBall"
                className="h-12 w-12 rounded-2xl border border-[#DED8D2] bg-white object-cover shadow-sm"
              />

              <div className="min-w-0">
                <h1 className="truncate text-xl font-black text-[#0B1F33]">
                  InCredoBall
                </h1>

                <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Sports & Recreation
                </p>
              </div>
            </Link>

            <Link
              to="/"
              className="rounded-2xl border border-[#DED8D2] bg-white px-4 py-2 text-sm font-black text-[#0B1F33] shadow-sm transition hover:bg-[#FFF8F6]"
            >
              Home
            </Link>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-[#DED8D2] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
            <div className="relative overflow-hidden bg-[#0B1F33] p-7 text-white sm:p-8">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#C97B6C]/25 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  <LogIn size={15} />
                  Account Login
                </div>

                <h2 className="mt-5 text-4xl font-black tracking-tight">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm font-semibold leading-7 text-white/70">
                  Sign in to continue to your InCredoBall dashboard.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-7 sm:p-8">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-black text-[#0B1F33]">
                  Email Address
                </label>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3 transition focus-within:border-[#C97B6C] focus-within:bg-white">
                  <Mail size={19} className="shrink-0 text-[#C97B6C]" />

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full bg-transparent text-sm font-bold text-[#0B1F33] outline-none placeholder:text-slate-400"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-black text-[#0B1F33]">
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm font-black text-[#C97B6C] transition hover:text-[#B86658]"
                  >
                    Forgot?
                  </Link>
                </div>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3 transition focus-within:border-[#C97B6C] focus-within:bg-white">
                  <LockKeyhole size={19} className="shrink-0 text-[#C97B6C]" />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-sm font-bold text-[#0B1F33] outline-none placeholder:text-slate-400"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="shrink-0 text-slate-400 transition hover:text-[#C97B6C]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:bg-[#B86658] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#DED8D2]" />
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  or
                </span>
                <div className="h-px flex-1 bg-[#DED8D2]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-[#DED8D2] bg-white px-6 py-4 text-sm font-black text-[#0B1F33] shadow-sm transition hover:bg-[#FFF8F6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F3F1] text-xs font-black">
                      G
                    </span>
                    Continue with Google
                  </>
                )}
              </button>

              <p className="mt-7 text-center text-sm font-semibold text-slate-500">
                Do not have an account?{" "}
                <Link
                  to="/register"
                  className="font-black text-[#C97B6C] transition hover:text-[#B86658]"
                >
                  Create one
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-xs font-semibold leading-6 text-slate-500">
            By signing in, you can access facility booking, booking history,
            notifications, and profile settings.
          </p>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-[#E8A093]">{value}</p>

      <p className="mt-1 text-xs font-bold text-white/60">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C97B6C] text-white">
        <Icon size={20} />
      </div>

      <h3 className="mt-4 text-lg font-black">{title}</h3>

      <p className="mt-1 text-sm font-semibold text-white/60">{text}</p>
    </div>
  );
}