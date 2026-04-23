import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToBucket } from "../../services/storageService";
import {
  approveCoachBooking,
  createCoach,
  deleteCoach,
  getAllCoachBookings,
  getCoaches,
  rejectCoachBooking,
  updateCoach,
} from "../../services/coachingService";

const COACH_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="22" fill="#64748b">Coach</text>
    </svg>
  `);

function formatTime(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

function getImageSrc(url) {
  return url || COACH_FALLBACK;
}

export default function CoachingManager() {
  const { user } = useAuth();

  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingCoachId, setDeletingCoachId] = useState(null);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        name: coachForm.name.trim(),
        specialty: coachForm.specialty.trim(),
        bio: coachForm.bio.trim(),
        experience: coachForm.experience.trim(),
        image_url: coachForm.image_url,
        is_active: coachForm.is_active,
        updated_by: user?.id || null,
        ...(editingCoachId ? {} : { created_by: user?.id || null }),
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

  async function handleDeleteCoach(id) {
    const confirmed = window.confirm("Delete this coach?");
    if (!confirmed) return;

    try {
      setDeletingCoachId(id);
      setError("");
      setMessage("");
      await deleteCoach(id);
      setMessage("Coach deleted successfully.");
      if (editingCoachId === id) {
        resetCoachForm();
      }
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete coach.");
    } finally {
      setDeletingCoachId(null);
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
    return { pending };
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
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Coaching Manager" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-violet-700 via-blue-700 to-slate-900 p-6 text-white md:p-8">
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card>
                <h2 className="text-2xl font-bold text-black">
                  {editingCoachId ? "Edit Coach" : "Add Coach"}
                </h2>
                <p className="mt-1 mb-6 text-sm text-black">
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
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                    placeholder="Coach name"
                  />

                  <input
                    name="specialty"
                    value={coachForm.specialty}
                    onChange={handleCoachChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                    placeholder="Specialty"
                  />

                  <input
                    name="experience"
                    value={coachForm.experience}
                    onChange={handleCoachChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                    placeholder="Experience"
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-black">
                      Coach Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black"
                    />

                    {uploadingImage ? (
                      <p className="text-sm text-black">Uploading image...</p>
                    ) : null}

                    {coachForm.image_url ? (
                      <img
                        src={getImageSrc(coachForm.image_url)}
                        alt="Coach preview"
                        className="h-36 w-36 rounded-2xl border object-cover"
                        onError={(e) => {
                          e.currentTarget.src = COACH_FALLBACK;
                        }}
                      />
                    ) : null}
                  </div>

                  <textarea
                    name="bio"
                    value={coachForm.bio}
                    onChange={handleCoachChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                    rows="4"
                    placeholder="Coach bio"
                  />

                  <label className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={coachForm.is_active}
                      onChange={handleCoachChange}
                    />
                    Active
                  </label>

                  <div className="flex gap-2">
                    <button
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                      type="submit"
                    >
                      {editingCoachId ? "Update Coach" : "Add Coach"}
                    </button>

                    {editingCoachId ? (
                      <button
                        type="button"
                        onClick={resetCoachForm}
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-black"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </Card>

              <Card>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-black">Coach Profiles</h3>
                  <p className="mt-1 text-sm text-black">
                    Edit, view, or delete existing coaches.
                  </p>
                </div>

                {loading ? (
                  <p className="text-black">Loading coaches...</p>
                ) : coaches.length === 0 ? (
                  <p className="text-black">No coaches found.</p>
                ) : (
                  <div className="space-y-4">
                    {coaches.map((coach) => (
                      <div
                        key={coach.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCoach(coach)}
                            className="shrink-0"
                          >
                            <img
                              src={getImageSrc(coach.image_url)}
                              alt={coach.name}
                              className="h-20 w-20 rounded-2xl border object-cover"
                              onError={(e) => {
                                e.currentTarget.src = COACH_FALLBACK;
                              }}
                            />
                          </button>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setSelectedCoach(coach)}
                              className="text-left"
                            >
                              <p className="truncate text-lg font-semibold text-black">
                                {coach.name}
                              </p>
                              <p className="mt-1 text-sm text-blue-700">
                                {coach.specialty}
                              </p>
                            </button>

                            <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                              {coach.bio || "No bio yet."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {coach.experience || "No experience set"}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  coach.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {coach.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCoach(coach)}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoach(coach.id)}
                            disabled={deletingCoachId === coach.id}
                            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                          >
                            {deletingCoachId === coach.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="flex min-h-[500px] flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">
                  Coaching Requests
                </h2>
              </div>

              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by coach, notes, or status"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="w-full xl:w-52">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="w-full xl:w-60">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Coach
                  </label>
                  <select
                    value={coachFilter}
                    onChange={(e) => setCoachFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
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
                  <label className="mb-2 block text-sm font-medium text-black">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
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
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-black transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>

              {loading ? (
                <p className="text-black">Loading coaching requests...</p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-black">No coaching requests found.</p>
              ) : (
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-black">
                            {booking.coaches?.name || "Coach"}
                          </p>
                          <p className="mt-1 text-sm text-black">
                            {booking.booking_date} • {formatTime(booking.start_time)} -{" "}
                            {formatTime(booking.end_time)}
                          </p>
                          <p className="mt-2 text-sm capitalize text-black">
                            {booking.session_mode.replaceAll("_", " ")} • Participants:{" "}
                            {booking.participants}
                          </p>
                          <p className="mt-1 text-sm text-black">
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
                            <span className="text-sm text-slate-700">Reviewed</span>
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

      {selectedCoach ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600">Coach Profile</p>
                <h2 className="mt-1 text-2xl font-bold text-black">
                  {selectedCoach.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  {selectedCoach.specialty}
                </p>
              </div>

              <button
                onClick={() => setSelectedCoach(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <img
                src={getImageSrc(selectedCoach.image_url)}
                alt={selectedCoach.name}
                className="h-72 w-full rounded-2xl border object-cover"
                onError={(e) => {
                  e.currentTarget.src = COACH_FALLBACK;
                }}
              />

              <div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Experience
                  </p>
                  <p className="mt-1 text-base font-semibold text-black">
                    {selectedCoach.experience || "Not specified"}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-7 text-black">
                    {selectedCoach.bio || "No bio provided yet."}
                  </p>
                </div>

                <div className="mt-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedCoach.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {selectedCoach.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoach(null);
                      handleEditCoach(selectedCoach);
                    }}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Edit Coach
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCoach(null)}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}