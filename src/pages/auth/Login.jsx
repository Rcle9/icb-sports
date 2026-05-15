import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

      if (loginError) throw loginError;

      const user = data?.user;

      if (!user) {
        throw new Error("Login failed. Please try again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = String(profile?.role || "user").toLowerCase();

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "staff") {
        navigate("/staff/dashboard", { replace: true });
      } else if (role === "coach") {
        navigate("/coach/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3F1] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#DED8D2] bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#2B2B2B]">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Login to your InCredoBall account.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
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
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full rounded-2xl border border-[#DED8D2] px-4 py-4 outline-none focus:border-[#C97B6C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#C97B6C] px-5 py-4 font-black text-white transition hover:bg-[#B87463] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-black text-[#C97B6C]">
            Register
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