import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUpUser } from "../../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signUpUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });

      setSuccess("Registration successful. Please check your email for confirmation.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3F1] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#DED8D2] bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#2B2B2B]">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register your InCredoBall Sports account.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Full Name
            </label>

            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Confirm Password
            </label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#C97B6C] px-5 py-4 font-black text-white transition hover:bg-[#B87463] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-black text-[#C97B6C]">
            Login
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm font-bold text-slate-500 hover:text-[#C97B6C]"
          >
            Back to landing page
          </Link>
        </div>
      </div>
    </main>
  );
}