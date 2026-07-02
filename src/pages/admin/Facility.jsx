import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { ListSkeleton } from "../../components/ui/Skeleton";
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
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" fill="#64748b">Facility</text>
    </svg>
  `);

const FACILITY_TYPES = ["Pickleball", "Basketball", "Table Tennis"];

function getImageSrc(url) {
  return url || FACILITY_FALLBACK;
}

function getFacilityImages(facility) {
  const images = [
    ...(Array.isArray(facility?.image_urls) ? facility.image_urls : []),
    facility?.image_url,
  ].filter(Boolean);

  return images.length ? [...new Set(images)] : [FACILITY_FALLBACK];
}

function getFacilityPrice(facility) {
  return Number(
    facility?.price ||
      facility?.rate_per_hour ||
      facility?.price_per_hour ||
      facility?.hourly_rate ||
      0
  );
}

export default function FacilityControl() {
  const { user } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "Pickleball",
    description: "",
    image_url: "",
    image_urls: [],
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

  async function handleMultipleImagesUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingImage(true);
      setError("");

      const uploadedUrls = [];

      for (const file of files) {
        const url = await uploadImageToBucket(
          file,
          "facility-images",
          "facilities"
        );

        uploadedUrls.push(url);
      }

      setForm((prev) => {
        const nextImages = [
          ...new Set([...(prev.image_urls || []), ...uploadedUrls]),
        ];

        return {
          ...prev,
          image_url: prev.image_url || uploadedUrls[0],
          image_urls: nextImages,
        };
      });
    } catch (err) {
      setError(err.message || "Failed to upload facility images.");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(url) {
    setForm((prev) => {
      const nextImages = (prev.image_urls || []).filter((item) => item !== url);
      const nextMain = prev.image_url === url ? nextImages[0] || "" : prev.image_url;

      return {
        ...prev,
        image_url: nextMain,
        image_urls: nextImages,
      };
    });
  }

  function setMainImage(url) {
    setForm((prev) => ({
      ...prev,
      image_url: url,
    }));
  }

  function handleEdit(facility) {
    const images = getFacilityImages(facility).filter(
      (item) => item !== FACILITY_FALLBACK
    );

    setEditingId(facility.id);
    setForm({
      name: facility.name || "",
      type: FACILITY_TYPES.includes(facility.type) ? facility.type : "Pickleball",
      description: facility.description || "",
      image_url: facility.image_url || images[0] || "",
      image_urls: images,
      price: getFacilityPrice(facility),
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
      type: "Pickleball",
      description: "",
      image_url: "",
      image_urls: [],
      price: "",
      is_active: true,
    });
  }

  function validateForm() {
    if (!form.name.trim()) {
      setError("Facility name is required.");
      return false;
    }

    if (!FACILITY_TYPES.includes(form.type)) {
      setError("Please select a valid facility type.");
      return false;
    }

    if (Number(form.price || 0) < 0) {
      setError("Price per hour cannot be negative.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!validateForm()) return;

    try {
      setSaving(true);

      const cleanImages = [...new Set(form.image_urls || [])];
      const priceValue = Number(form.price || 0);

      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        image_url: form.image_url || cleanImages[0] || "",
        image_urls: cleanImages,
        price: priceValue,
        rate_per_hour: priceValue,
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

  function openFacilityView(facility) {
    setSelectedFacility(facility);
    setPreviewImage(getImageSrc(facility.image_url || getFacilityImages(facility)[0]));
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="page-main min-w-0">
        <div className="page-container min-w-0">
          <Topbar title="Facility Control" />

          <div className="mb-6 rounded-[28px] bg-[#C97B6C] p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">
              Facility Management
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Create and manage sports facilities.
            </h2>

            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
              Add facility images, pricing, descriptions, and availability for
              Pickleball, Basketball, and Table Tennis.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <Card className="h-fit min-w-0">
              <h2 className="text-2xl font-bold text-black">
                {editingId ? "Edit Facility" : "Add Facility"}
              </h2>

              <p className="mt-1 mb-6 text-sm text-black">
                Use the correct facility type so it appears in the proper booking
                calendar tab.
              </p>

              {error && (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Facility Name
                  </label>

                  <input
                    name="name"
                    placeholder="Example: Pickleball Court 1"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-[#C97B6C]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Facility Type
                  </label>

                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-[#C97B6C]"
                  >
                    {FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Price per Hour
                  </label>

                  <input
                    name="price"
                    type="number"
                    placeholder="Example: 300"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-[#C97B6C]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Facility details / description"
                    value={form.description}
                    onChange={handleChange}
                    rows="5"
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-[#C97B6C]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-black">
                    Facility Images
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImagesUpload}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black"
                  />

                  {uploadingImage && (
                    <p className="text-sm text-black">Uploading images...</p>
                  )}

                  {form.image_urls?.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {form.image_urls.map((url) => (
                        <div
                          key={url}
                          className={`relative overflow-hidden rounded-2xl border ${
                            form.image_url === url
                              ? "border-[#C97B6C] ring-2 ring-[#D88E80]/40"
                              : "border-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setMainImage(url)}
                            className="block h-28 w-full bg-slate-100"
                          >
                            <img
                              src={getImageSrc(url)}
                              alt="Facility"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = FACILITY_FALLBACK;
                              }}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            ×
                          </button>

                          {form.image_url === url && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-[#C97B6C] px-2 py-1 text-[10px] font-bold text-white">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                    className="w-full rounded-2xl bg-[#C97B6C] px-4 py-3 font-semibold text-white transition hover:bg-[#B96A5D] disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Facility"
                      : "Add Facility"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-black"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </Card>

            <Card className="flex min-h-[500px] max-h-[calc(100vh-180px)] flex-col overflow-hidden">
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-black">Facilities</h2>
    <p className="mt-1 text-sm text-black">
      Current facilities in the system.
    </p>
  </div>

  {loading ? (
    <ListSkeleton />
  ) : facilities.length === 0 ? (
    <p className="text-black">No facilities yet.</p>
  ) : (
    <div className="panel-scroll hide-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
                  {facilities.map((facility) => {
                    const price = getFacilityPrice(facility);

                    return (
                      <div
                        key={facility.id}
                        className="card-hover rounded-2xl border border-slate-200 p-4 md:p-5"
                      >
                        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <button
                            type="button"
                            onClick={() => openFacilityView(facility)}
                            className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 text-left md:grid-cols-[110px_minmax(0,1fr)]"
                          >
                            <img
                              src={getImageSrc(
                                facility.image_url || getFacilityImages(facility)[0]
                              )}
                              alt={facility.name}
                              className="h-24 w-24 shrink-0 rounded-2xl border object-cover md:h-28 md:w-28"
                              onError={(e) => {
                                e.currentTarget.src = FACILITY_FALLBACK;
                              }}
                            />

                            <div className="min-w-0">
                              <p className="truncate text-lg font-bold text-black md:text-xl">
                                {facility.name}
                              </p>

                              <p className="mt-1 truncate text-sm font-medium text-black">
                                {facility.type}
                              </p>

                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-black">
                                {facility.description || "No details provided."}
                              </p>

                              <p className="mt-3 text-sm font-semibold text-[#C97B6C]">
                                ₱ {price.toLocaleString()} / hour
                              </p>
                            </div>
                          </button>

                          <div className="flex flex-row flex-wrap items-center justify-start gap-2 lg:flex-col lg:items-end">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                facility.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {facility.is_active ? "Active" : "Inactive"}
                            </span>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openFacilityView(facility)}
                                className="rounded-xl bg-[#F3E4DF] px-4 py-2 text-sm font-semibold text-[#C97B6C] transition hover:bg-[#EBD7D0]"
                              >
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(facility)}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(facility.id, facility.name)
                                }
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {selectedFacility && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Facility View</h2>

              <button
                onClick={() => setSelectedFacility(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[78px_minmax(0,1fr)]">
                <div className="flex max-h-[720px] gap-3 overflow-x-auto pr-1 md:flex-col md:overflow-y-auto">
                  {getFacilityImages(selectedFacility).map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setPreviewImage(getImageSrc(img))}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-slate-100 ${
                        previewImage === getImageSrc(img)
                          ? "border-black"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={getImageSrc(img)}
                        alt={selectedFacility.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FACILITY_FALLBACK;
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="relative flex min-h-[360px] items-center justify-center rounded-2xl bg-[#f3f4f6] md:min-h-[560px]">
                  <img
                    src={previewImage || getImageSrc(selectedFacility.image_url)}
                    alt={selectedFacility.name}
                    className="h-full max-h-[680px] w-full rounded-2xl object-contain p-6"
                    onError={(e) => {
                      e.currentTarget.src = FACILITY_FALLBACK;
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                <h1 className="break-words text-3xl font-bold text-black">
                  {selectedFacility.name}
                </h1>

                <p className="mt-1 text-lg text-slate-600">
                  {selectedFacility.type}
                </p>

                <p className="mt-5 text-xl font-bold text-black">
                  ₱{getFacilityPrice(selectedFacility).toLocaleString()} / hour
                </p>

                <p className="mt-5 text-sm leading-7 text-black">
                  {selectedFacility.description || "No facility description yet."}
                </p>

                <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-black">
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                    <span>Hourly Rate</span>
                    <span className="font-bold">
                      ₱{getFacilityPrice(selectedFacility).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-slate-200 py-3">
                    <span>Status</span>
                    <span className="font-bold">
                      {selectedFacility.is_active === false
                        ? "Unavailable"
                        : "Available"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 pt-3">
                    <span>Facility Type</span>
                    <span className="font-bold">
                      {selectedFacility.type || "Facility"}
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFacility(null);
                      handleEdit(selectedFacility);
                    }}
                    className="w-full rounded-full bg-black px-6 py-5 text-base font-bold text-white transition hover:bg-slate-800"
                  >
                    Edit Facility
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFacility(null)}
                    className="w-full rounded-full border border-slate-300 bg-white px-6 py-5 text-base font-bold text-black transition hover:border-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}