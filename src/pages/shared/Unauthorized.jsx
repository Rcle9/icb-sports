import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-3">Unauthorized</h1>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page.
        </p>
        <Link
          to="/login"
          className="inline-block bg-[#C97B6C] text-white px-5 py-3 rounded-xl font-semibold"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}