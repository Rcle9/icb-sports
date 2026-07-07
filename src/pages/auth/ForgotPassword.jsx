// src/pages/auth/ForgotPassword.jsx

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { resetPassword, updateUserPassword } from "../../services/authService";
import logo from "../../assets/ICBLOGO.jpg";
import heroImage from "../../assets/landing/hero.jpg";

function hasRecoveryToken() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";

  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    hash.includes("access_token") ||
    search.includes("access_token")
  );
}

export default function ForgotPassword() {
  const [mode] = useState(hasRecoveryToken() ? "update" : "request");

  const [email, setEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const passwordStrength = useMemo(() => {
    const password = passwordForm.newPassword;

    let score = 0;

    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (!password) {
      return {
        label: "No password yet",
        width: "0%",
        className: "bg-slate-200",
      };
    }

    if (score <= 2) {
      return {
        label: "Weak",
        width: "35%",
        className: "bg-red-500",
      };
    }

    if (score <= 4) {
      return {
        label: "Good",
        width: "70%",
        className: "bg-amber-500",
      };
    }

    return {
      label: "Strong",
      width: "100%",
      className: "bg-green-600",
    };
  }, [passwordForm.newPassword]);

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleRequestReset(event) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await resetPassword(email.trim());

      setSuccess(
        "Password reset link sent. Please check your email and follow the instructions."
      );
      setEmail("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to send password reset link. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await updateUserPassword(passwordForm.newPassword);

      setPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });

      setSuccess("Password updated successfully. You may now sign in.");
    } catch (err) {
      setError(
        err.message ||
          "Unable to update password. Please open the reset link again."
      );
    } finally {
      setLoading(false);
    }
  }

  const isUpdateMode = mode === "update";

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
              Secure Account Recovery
            </div>

            <h2 className="mt-7 text-6xl font-black leading-[0.98] tracking-tight xl:text-7xl">
              Recover.
              <span className="block text-[#E8A093]">Reset.</span>
              Return.
            </h2>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/75">
              Reset your password securely and get back to managing your
              InCredoBall facility reservations.
            </p>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
              <HeroStat value="Secure" label="Recovery" />
              <HeroStat value="Email" label="Reset Link" />
              <HeroStat value="Fast" label="Access" />
            </div>
          </div>

          <div className="grid max-w-3xl grid-cols-3 gap-4">
            <FeatureCard
              icon={Mail}
              title="Request"
              text="Send reset link"
            />
            <FeatureCard
              icon={LockKeyhole}
              title="Reset"
              text="Create password"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Secure"
              text="Protect account"
            />
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/15 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 h-96 w-96 rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative w-full max-w-[540px]">
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
                  {isUpdateMode ? (
                    <>
                      <LockKeyhole size={15} />
                      New Password
                    </>
                  ) : (
                    <>
                      <RefreshCw size={15} />
                      Password Recovery
                    </>
                  )}
                </div>

                <h2 className="mt-5 text-4xl font-black tracking-tight">
                  {isUpdateMode ? "Set new password" : "Reset your password"}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-7 text-white/70">
                  {isUpdateMode
                    ? "Enter a new password for your InCredoBall account."
                    : "Enter your email and we will send you a password reset link."}
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-8">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold leading-6 text-green-700">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {!isUpdateMode ? (
                <form onSubmit={handleRequestReset}>
                  <div>
                    <label className="text-sm font-black text-[#0B1F33]">
                      Email Address
                    </label>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3 transition focus-within:border-[#C97B6C] focus-within:bg-white">
                      <Mail size={19} className="shrink-0 text-[#C97B6C]" />

                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-transparent text-sm font-bold text-[#0B1F33] outline-none placeholder:text-slate-400"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:bg-[#B86658] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleUpdatePassword}>
                  <div>
                    <label className="text-sm font-black text-[#0B1F33]">
                      New Password
                    </label>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3 transition focus-within:border-[#C97B6C] focus-within:bg-white">
                      <LockKeyhole
                        size={19}
                        className="shrink-0 text-[#C97B6C]"
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        className="w-full bg-transparent text-sm font-bold text-[#0B1F33] outline-none placeholder:text-slate-400"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="shrink-0 text-slate-400 transition hover:text-[#C97B6C]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-[#F3E4DF]">
                        <div
                          className={`h-full rounded-full transition-all ${passwordStrength.className}`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>

                      <p className="mt-2 text-xs font-black text-slate-500">
                        Password strength:{" "}
                        <span className="text-[#C97B6C]">
                          {passwordStrength.label}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-black text-[#0B1F33]">
                      Confirm Password
                    </label>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] px-4 py-3 transition focus-within:border-[#C97B6C] focus-within:bg-white">
                      <LockKeyhole
                        size={19}
                        className="shrink-0 text-[#C97B6C]"
                      />

                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                        className="w-full bg-transparent text-sm font-bold text-[#0B1F33] outline-none placeholder:text-slate-400"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="shrink-0 text-slate-400 transition hover:text-[#C97B6C]"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(201,123,108,0.25)] transition hover:bg-[#B86658] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <Link
                to="/login"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#DED8D2] bg-white px-6 py-4 text-sm font-black text-[#0B1F33] transition hover:bg-[#FFF8F6]"
              >
                <ArrowLeft size={18} />
                Back to Login
              </Link>

              <p className="mt-7 text-center text-sm font-semibold text-slate-500">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="font-black text-[#C97B6C] transition hover:text-[#B86658]"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-semibold leading-6 text-slate-500">
            For security, password reset links may expire after a short period.
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