import { useState } from "react";
import { Link } from "react-router-dom";
import { resetPassword } from "../../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await resetPassword(email);
      setMessage("Password reset email sent.");
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-[#0f172a] mb-2">Forgot Password</h1>
        <p className="text-gray-500 mb-6">Enter your email to receive a reset link.</p>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-lg bg-green-50 text-green-600 px-4 py-3 text-sm">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border rounded-xl px-4 py-3 outline-none"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-6 text-sm text-center">
          <Link to="/login" className="text-blue-600">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}