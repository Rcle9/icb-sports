import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInUser, signInWithGoogle } from "../../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInUser(form);
      navigate("/redirect");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google login failed.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-[#0f172a] mb-2">Login</h1>
        <p className="text-gray-500 mb-6">Access your InCredoball Sports account.</p>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-3 outline-none"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-3 outline-none"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full mt-4 border rounded-xl py-3 font-semibold hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-blue-600">
            Forgot password?
          </Link>
          <Link to="/register" className="text-blue-600">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}