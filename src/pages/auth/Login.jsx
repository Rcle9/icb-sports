import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { signInUser, signInWithGoogle } from "../../services/authService";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.68 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.42 8.52 1 10.21 1 12s.42 3.48 1.15 4.94l3.69-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.3 9.14 5.37 12 5.37z"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

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

    try {
      setError("");
      setLoading(true);

      await signInUser(form);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed.");
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
      console.error(err);
      setError(err.message || "Google sign in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3F1] px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-[#DED8D2] bg-white shadow-[0_20px_60px_rgba(11,31,51,0.12)] lg:grid-cols-[1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[#0B1F33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#C97B6C]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E8A093]">
              InCredoBall
            </p>

            <h1 className="mt-5 max-w-xl text-5xl font-black leading-tight">
              Sports facility management made simple.
            </h1>

            <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/75">
              Book facilities, track reservations, upload payment proof, and receive
              real-time updates from one secure portal.
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <InfoBox title="Facility Booking" text="Reserve exact courts and tables." />
            <InfoBox title="Payment Tracking" text="Upload proof for verification." />
            <InfoBox title="Notifications" text="Receive booking updates." />
            <InfoBox title="Secure Access" text="Login with email or Google." />
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C97B6C]">
                Welcome Back
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33]">
                Sign in
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Access your InCredoBall Sports account.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#DED8D2] bg-white px-5 py-3.5 text-sm font-black text-[#0B1F33] transition hover:bg-[#F3E4DF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Opening Google..." : "Continue with Google"}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#DED8D2]" />
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                or
              </span>
              <div className="h-px flex-1 bg-[#DED8D2]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField icon={Mail}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-transparent py-3 pl-11 pr-4 text-sm font-semibold text-[#0B1F33] outline-none placeholder:text-slate-400"
                  required
                />
              </FormField>

              <FormField icon={Lock}>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-transparent py-3 pl-11 pr-4 text-sm font-semibold text-[#0B1F33] outline-none placeholder:text-slate-400"
                  required
                />
              </FormField>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-5 py-4 text-sm font-black text-white transition hover:bg-[#B86658] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn size={18} />
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
              <Link to="/forgot-password" className="text-[#C97B6C] hover:underline">
                Forgot password?
              </Link>

              <Link to="/register" className="text-[#0B1F33] hover:text-[#C97B6C]">
                Create account
              </Link>
            </div>

            <Link
              to="/"
              className="mt-8 inline-flex text-sm font-bold text-slate-500 hover:text-[#C97B6C]"
            >
              Back to website
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FormField({ icon: Icon, children }) {
  return (
    <div className="relative rounded-2xl border border-[#DED8D2] bg-white transition focus-within:border-[#C97B6C] focus-within:ring-4 focus-within:ring-[#C97B6C]/10">
      <Icon
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {children}
    </div>
  );
}

function InfoBox({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-5 text-white/65">{text}</p>
    </div>
  );
}