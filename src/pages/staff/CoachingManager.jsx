import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToBucket } from "../../services/storageService";
import {
  approveCoachBooking,
  createCoach,
  getAllCoachBookings,
  getCoaches,
  rejectCoachBooking,
  updateCoach,
} from "../../services/coachingService";

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export default function CoachingManager() {
  const { user } = useAuth();

  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingCoachId, setEditingCoachId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [coachForm, setCoachForm] = useState({
    name: "",
    specialty: "",
    bio: "",
    experience: "",
    image_url: "",
    is_active: true,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [coachData, bookingData] = await Promise.all([
        getCoaches(),
        getAllCoachBookings(),
      ]);

      setCoaches(coachData || []);
      setBookings(bookingData || []);
    } catch (err) {
      setError(err.message || "Failed to load coaching manager data.");
    } finally {
      setLoading(false);
    }
  }

  function handleCoachChange(e) {
    const { name, value, type, checked } = e.target;
    setCoachForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError("");
      const url = await uploadImageToBucket(file, "coach-images", "profiles");

      setCoachForm((prev) => ({
        ...prev,
        image_url: url,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload coach image.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleEditCoach(coach) {
    setEditingCoachId(coach.id);
    setCoachForm({
      name: coach.name || "",
      specialty: coach.specialty || "",
      bio: coach.bio || "",
      experience: coach.experience || "",
      image_url: coach.image_url || "",
      is_active: coach.is_active ?? true,
    });
  }

  function resetCoachForm() {
    setEditingCoachId(null);
    setCoachForm({
      name: "",
      specialty: "",
      bio: "",
      experience: "",
      image_url: "",
      is_active: true,
    });
  }

  async function handleCoachSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!coachForm.name.trim() || !coachForm.specialty.trim()) {
      setError("Coach name and specialty are required.");
      return;
    }

    try {
      const payload = {
        ...coachForm,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      };

      if (editingCoachId) {
        await updateCoach(editingCoachId, payload);
        setMessage("Coach updated successfully.");
      } else {
        await createCoach(payload);
        setMessage("Coach added successfully.");
      }

      resetCoachForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save coach.");
    }
  }

  async function handleApprove(id) {
    try {
      setActionLoadingId(id);
      setError("");
      await approveCoachBooking(id, user.id);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to approve coach booking.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(id) {
    try {
      setActionLoadingId(id);
      setError("");
      await rejectCoachBooking(id, user.id);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to reject coach booking.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const summary = useMemo(() => {
    const pending = bookings.filter((item) => item.status === "pending").length;
    const approved = bookings.filter((item) => item.status === "approved").length;
    const rejected = bookings.filter((item) => item.status === "rejected").length;
    const total = bookings.length;

    return { total, pending, approved, rejected };
  }, [bookings]);

  const coachOptions = useMemo(() => {
    const uniqueCoaches = Array.from(
      new Set(bookings.map((item) => item.coaches?.name).filter(Boolean))
    );
    return uniqueCoaches.sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const coachName = booking.coaches?.name || "";
      const bookingDate = booking.booking_date || "";
      const bookingStatus = booking.status || "";
      const searchSource =
        `${coachName} ${bookingDate} ${bookingStatus} ${booking.notes || ""}`.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ? true : bookingStatus === statusFilter;

      const matchesCoach =
        coachFilter === "all" ? true : coachName === coachFilter;

      const matchesDate = dateFilter ? bookingDate === dateFilter : true;

      const matchesSearch = searchTerm
        ? searchSource.includes(searchTerm.toLowerCase())
        : true;

      return matchesStatus && matchesCoach && matchesDate && matchesSearch;
    });
  }, [bookings, statusFilter, coachFilter, dateFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-[1500px]">
          <Topbar title="Coaching Manager" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-violet-700 via-blue-700 to-slate-900 p-6 text-white shadow-[0_18px_45px_rgba(76,29,149,0.24)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Coach Operations Center
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Manage coach profiles and review coaching requests.
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 md:w-[360px]">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-bold">{summary.pending}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Coaches
                  </p>
                  <p className="mt-2 text-2xl font-bold">{coaches.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingCoachId ? "Edit Coach" : "Add Coach"}
              </h2>
              <p className="mt-1 mb-6 text-sm text-slate-500">
                Add coach details and upload a profile image.
              </p>

              {error ? (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>
              ) : null}

              <form onSubmit={handleCoachSubmit} className="space-y-4">
                <input
                  name="name"
                  value={coachForm.name}
                  onChange={handleCoachChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Coach name"
                />

                <input
                  name="specialty"
                  value={coachForm.specialty}
                  onChange={handleCoachChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Specialty"
                />

                <input
                  name="experience"
                  value={coachForm.experience}
                  onChange={handleCoachChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Experience"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Coach Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                  {uploadingImage ? (
                    <p className="text-sm text-slate-500">Uploading image...</p>
                  ) : null}

                  {coachForm.image_url ? (
                    <img
                      src={coachForm.image_url}
                      alt="Coach preview"
                      className="h-36 w-36 rounded-2xl object-cover border"
                    />
                  ) : null}
                </div>

                <textarea
                  name="bio"
                  value={coachForm.bio}
                  onChange={handleCoachChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  rows="4"
                  placeholder="Coach bio"
                />

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={coachForm.is_active}
                    onChange={handleCoachChange}
                  />
                  Active
                </label>

                <div className="flex gap-2">
                  <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)] transition hover:bg-blue-700">
                    {editingCoachId ? "Update Coach" : "Add Coach"}
                  </button>

                  {editingCoachId ? (
                    <button
                      type="button"
                      onClick={resetCoachForm}
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </Card>

            <Card className="xl:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Coaching Requests
                </h2>
              </div>

              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by coach, notes, or status"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="w-full xl:w-52">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="w-full xl:w-60">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Coach
                  </label>
                  <select
                    value={coachFilter}
                    onChange={(e) => setCoachFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="all">All Coaches</option>
                    {coachOptions.map((coach) => (
                      <option key={coach} value={coach}>
                        {coach}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full xl:w-52">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCoachFilter("all");
                    setDateFilter("");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>

              {loading ? (
                <p className="text-slate-500">Loading coaching requests...</p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-slate-500">No coaching requests found.</p>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {booking.coaches?.name || "Coach"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                            {formatTime(booking.end_time)}
                          </p>
                          <p className="mt-2 text-sm capitalize text-slate-500">
                            {booking.session_mode.replaceAll("_", " ")} • Participants:{" "}
                            {booking.participants}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Notes: {booking.notes || "-"}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              booking.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : booking.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {booking.status}
                          </span>

                          {booking.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(booking.id)}
                                disabled={actionLoadingId === booking.id}
                                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                              >
                                {actionLoadingId === booking.id ? "..." : "Approve"}
                              </button>

                              <button
                                onClick={() => handleReject(booking.id)}
                                disabled={actionLoadingId === booking.id}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                              >
                                {actionLoadingId === booking.id ? "..." : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Reviewed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}