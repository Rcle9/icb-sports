import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);

    setForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#0f172a]">Contact Us</h1>
            <p className="text-gray-600 mt-2">
              Reach out for system support, questions, or assistance.
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Send a Message</h2>

            {submitted ? (
              <div className="mb-4 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">
                Your message has been recorded. You can connect this later to a real backend or email service.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 outline-none"
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Your email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 outline-none"
                required
              />

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 outline-none"
                required
              />

              <textarea
                name="message"
                rows="6"
                placeholder="Write your message here"
                value={form.message}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 outline-none resize-none"
                required
              />

              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
              >
                Send Message
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Contact Details</h2>

            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-[#0f172a]">Email</p>
                <p>support@incredoball.local</p>
              </div>

              <div>
                <p className="font-semibold text-[#0f172a]">Phone</p>
                <p>+63 900 000 0000</p>
              </div>

              <div>
                <p className="font-semibold text-[#0f172a]">Office Hours</p>
                <p>Monday to Saturday, 8:00 AM – 6:00 PM</p>
              </div>

              <div>
                <p className="font-semibold text-[#0f172a]">Location</p>
                <p>InCredoBall Sports and Development Center</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}