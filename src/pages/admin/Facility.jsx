import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToBucket } from "../../services/storageService";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from "../../services/facilityService";

const FACILITY_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="22" fill="#64748b">Facility</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || FACILITY_FALLBACK;
}

export default function FacilityControl() {
  const { user } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
    image_url: "",
    price: "",
    is_active: true,
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  async function loadFacilities() {
    try {
      setLoading(true);
      setError("");
      const data = await getFacilities();
      setFacilities(data || []);
    } catch (err) {
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
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
      const url = await uploadImageToBucket(file, "facility-images", "facilities");

      setForm((prev) => ({
        ...prev,
        image_url: url,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload facility image.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleEdit(facility) {
    setEditingId(facility.id);
    setForm({
      name: facility.name || "",
      type: facility.type || "",
      description: facility.description || "",
      image_url: facility.image_url || "",
      price: facility.price || "",
      is_active: facility.is_active ?? true,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      type: "",
      description: "",
      image_url: "",
      price: "",
      is_active: true,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.type.trim()) {
      setError("Facility name and type are required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description.trim(),
        image_url: form.image_url,
        price: Number(form.price || 0),
        is_active: form.is_active,
        updated_by: user?.id || null,
        ...(editingId ? {} : { created_by: user?.id || null }),
      };

      if (editingId) {
        await updateFacility(editingId, payload);
        setMessage("Facility updated successfully.");
      } else {
        await createFacility(payload);
        setMessage("Facility created successfully.");
      }

      resetForm();
      await loadFacilities();
    } catch (err) {
      setError(err.message || "Failed to save facility.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    const confirmed = window.confirm(`Delete "${name}"?`);
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      await deleteFacility(id);
      setMessage("Facility deleted successfully.");
      if (editingId === id) resetForm();
      await loadFacilities();
    } catch (err) {
      setError(err.message || "Failed to delete facility.");
    }
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Facility Control" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">Facility Management</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Create and manage sports facilities.
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
              Control facility details, pricing, descriptions, images, and availability from one admin workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Card>
              <h2 className="text-2xl font-bold text-black">
                {editingId ? "Edit Facility" : "Add Facility"}
              </h2>
              <p className="mt-1 mb-6 text-sm text-black">
                Add full facility information including image, price, and details.
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="name"
                  placeholder="Facility Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <input
                  name="type"
                  placeholder="Type (Basketball, Pickleball, Table Tennis)"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-black">
                    Facility Image
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

                  {form.image_url ? (
                    <img
                      src={getImageSrc(form.image_url)}
                      alt="Facility preview"
                      className="h-36 w-36 rounded-2xl border object-cover"
                      onError={(e) => {
                        e.currentTarget.src = FACILITY_FALLBACK;
                      }}
                    />
                  ) : null}
                </div>

                <textarea
                  name="description"
                  placeholder="Facility details / description"
                  value={form.description}
                  onChange={handleChange}
                  rows="5"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <input
                  name="price"
                  type="number"
                  placeholder="Price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <label className="flex items-center gap-2 text-sm text-black">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  Active
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingId ? "Update Facility" : "Add Facility"}
                  </button>

                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-black"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </Card>

            <Card className="flex min-h-[500px] flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">Facilities</h2>
                <p className="mt-1 text-sm text-black">
                  Current facilities in the system.
                </p>
              </div>

              {loading ? (
                <p className="text-black">Loading facilities...</p>
              ) : facilities.length === 0 ? (
                <p className="text-black">No facilities yet.</p>
              ) : (
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                  {facilities.map((facility) => (
                    <div key={facility.id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedFacility(facility)}
                          className="flex min-w-0 flex-1 gap-4 text-left"
                        >
                          <img
                            src={getImageSrc(facility.image_url)}
                            alt={facility.name}
                            className="h-28 w-28 shrink-0 rounded-2xl border object-cover"
                            onError={(e) => {
                              e.currentTarget.src = FACILITY_FALLBACK;
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="safe-text text-xl font-semibold">{facility.name}</p>
                            <p className="safe-text mt-1 text-sm font-medium">{facility.type}</p>
                            <p className="safe-text mt-3 text-sm leading-6">
                              {facility.description || "No details provided."}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-blue-700">
                              ₱ {facility.price || 0}
                            </p>
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              facility.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {facility.is_active ? "Active" : "Inactive"}
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(facility)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(facility.id, facility.name)}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
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

      {selectedFacility ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600">Facility Details</p>
                <h2 className="mt-1 text-2xl font-bold text-black">
                  {selectedFacility.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  {selectedFacility.type}
                </p>
              </div>

              <button
                onClick={() => setSelectedFacility(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <img
                src={getImageSrc(selectedFacility.image_url)}
                alt={selectedFacility.name}
                className="h-72 w-full rounded-2xl border object-cover"
                onError={(e) => {
                  e.currentTarget.src = FACILITY_FALLBACK;
                }}
              />

              <div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Price
                  </p>
                  <p className="mt-1 text-base font-semibold text-black">
                    ₱ {selectedFacility.price || 0}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-7 text-black">
                    {selectedFacility.description || "No description provided yet."}
                  </p>
                </div>

                <div className="mt-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedFacility.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {selectedFacility.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFacility(null);
                      handleEdit(selectedFacility);
                    }}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Edit Facility
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFacility(null)}
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