// src/pages/admin/Facility.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
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
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <circle cx="300" cy="230" r="72" fill="#e2e8f0"/>
      <rect x="175" y="340" width="250" height="38" rx="19" fill="#cbd5e1"/>
      <text x="50%" y="74%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="24" font-weight="700" fill="#64748b">Facility</text>
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

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function getStatusText(facility) {
  return facility?.is_active === false ? "Inactive" : "Active";
}

function getStatusClass(facility) {
  return facility?.is_active === false
    ? "bg-slate-100 text-slate-700"
    : "bg-green-100 text-green-700";
}

export default function FacilityControl() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const searchableText = [
        facility.name,
        facility.type,
        facility.description,
        getFacilityPrice(facility),
        getStatusText(facility),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || searchableText.includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || facility.type === typeFilter;

      const status = facility.is_active === false ? "inactive" : "active";
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [facilities, search, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const active = facilities.filter(
      (facility) => facility.is_active !== false
    ).length;

    const inactive = facilities.filter(
      (facility) => facility.is_active === false
    ).length;

    const pickleball = facilities.filter(
      (facility) => facility.type === "Pickleball"
    ).length;

    const basketball = facilities.filter(
      (facility) => facility.type === "Basketball"
    ).length;

    const tableTennis = facilities.filter(
      (facility) => facility.type === "Table Tennis"
    ).length;

    const averageRate =
      facilities.length > 0
        ? facilities.reduce((sum, facility) => {
            return sum + getFacilityPrice(facility);
          }, 0) / facilities.length
        : 0;

    return {
      total: facilities.length,
      active,
      inactive,
      pickleball,
      basketball,
      tableTennis,
      averageRate,
      shown: filteredFacilities.length,
    };
  }, [facilities, filteredFacilities.length]);

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

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadFacilities();
    } finally {
      setRefreshing(false);
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
      e.target.value = "";
    }
  }

  function removeImage(url) {
    setForm((prev) => {
      const nextImages = (prev.image_urls || []).filter((item) => item !== url);
      const nextMain =
        prev.image_url === url ? nextImages[0] || "" : prev.image_url;

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
      type: FACILITY_TYPES.includes(facility.type)
        ? facility.type
        : "Pickleball",
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

  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
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
    <div className="page-shell">
      <Sidebar
        role="admin"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Facility Management"
            subtitle="Create, update, preview, and manage facility booking availability."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Facility Control
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Manage sports facilities with cleaner controls.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Add court images, descriptions, hourly rates, sport type, and
                  active status for Pickleball, Basketball, and Table Tennis
                  booking schedules.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Facilities" value={summary.total} />
                <HeroStat label="Active" value={summary.active} />
                <HeroStat label="Inactive" value={summary.inactive} />
                <HeroStat label="Avg Rate" value={money(summary.averageRate)} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total Facilities"
              value={summary.total}
              description="All facility records"
              icon={<Building2 size={22} />}
              tone="coral"
            />

            <MetricCard
              title="Active"
              value={summary.active}
              description="Available for booking"
              icon={<CheckCircle2 size={22} />}
              tone="green"
            />

            <MetricCard
              title="Inactive"
              value={summary.inactive}
              description="Hidden or unavailable"
              icon={<XCircle size={22} />}
              tone="slate"
            />

            <MetricCard
              title="Pickleball"
              value={summary.pickleball}
              description="Pickleball facilities"
              icon={<Building2 size={22} />}
              tone="blue"
            />

            <MetricCard
              title="Shown"
              value={summary.shown}
              description="Current filter result"
              icon={<Search size={22} />}
              tone="amber"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6">
                <p className="icb-eyebrow">Facility Form</p>

                <h3 className="icb-section-title mt-2">
                  {editingId ? "Edit Facility" : "Add Facility"}
                </h3>

                <p className="icb-section-subtitle">
                  Use the correct facility type so it appears in the right
                  booking calendar tab.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Facility Name"
                  name="name"
                  placeholder="Example: Pickleball Court 1"
                  value={form.name}
                  onChange={handleChange}
                />

                <div>
                  <label className="icb-label">Facility Type</label>

                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="icb-select"
                  >
                    {FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Price per Hour"
                  name="price"
                  type="number"
                  placeholder="Example: 300"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                />

                <div>
                  <label className="icb-label">Description</label>

                  <textarea
                    name="description"
                    placeholder="Facility details / description"
                    value={form.description}
                    onChange={handleChange}
                    rows="5"
                    className="icb-textarea"
                  />
                </div>

                <div className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <label className="icb-label mb-0">Facility Images</label>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Upload one or more preview images.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black text-[#B86658]">
                      {form.image_urls.length} image
                      {form.image_urls.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#DED8D2] bg-white px-4 py-6 text-center transition hover:border-[#C97B6C]/50 hover:bg-[#FFF8F6]">
                    <ImagePlus size={28} className="text-[#C97B6C]" />

                    <p className="mt-2 text-sm font-black text-[#0B1F33]">
                      {uploadingImage ? "Uploading images..." : "Choose images"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      JPG, PNG, or WEBP
                    </p>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  {form.image_urls?.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {form.image_urls.map((url) => (
                        <div
                          key={url}
                          className={`relative overflow-hidden rounded-2xl border bg-white ${
                            form.image_url === url
                              ? "border-[#C97B6C] ring-2 ring-[#D88E80]/40"
                              : "border-[#DED8D2]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setMainImage(url)}
                            className="block h-24 w-full bg-slate-100"
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
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white shadow-sm"
                          >
                            <X size={14} />
                          </button>

                          {form.image_url === url && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-[#C97B6C] px-2 py-1 text-[10px] font-black text-white">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#DED8D2] bg-white p-5 text-center text-sm font-semibold text-slate-500">
                      No facility images uploaded yet.
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] px-4 py-4 text-sm font-bold text-[#0B1F33] transition hover:border-[#C97B6C]/50">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 accent-[#C97B6C]"
                  />
                  Active and available for booking
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving}
                    className="icb-btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={17} />
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
                      className="icb-btn-light"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="icb-eyebrow">Facility List</p>

                  <h3 className="icb-section-title mt-2">Facilities</h3>

                  <p className="icb-section-subtitle">
                    {filteredFacilities.length} of {facilities.length} facility
                    {facilities.length === 1 ? "" : "ies"} shown.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="icb-btn-light"
                  >
                    Reset Filters
                  </button>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="icb-btn-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={17}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                  <label className="icb-label">Search</label>

                  <div className="relative">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search facility, type, description, or price"
                      className="icb-input pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="icb-label">Type</label>

                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="icb-select"
                  >
                    <option value="all">All Types</option>
                    {FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="icb-label">Status</label>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="icb-select"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-36 animate-pulse rounded-2xl border border-[#DED8D2] bg-[#FBFAF9]"
                    />
                  ))}
                </div>
              ) : filteredFacilities.length === 0 ? (
                <EmptyState text="No facilities found." />
              ) : (
                <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
                  {filteredFacilities.map((facility) => (
                    <FacilityCard
                      key={facility.id}
                      facility={facility}
                      onView={() => openFacilityView(facility)}
                      onEdit={() => handleEdit(facility)}
                      onDelete={() => handleDelete(facility.id, facility.name)}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      {selectedFacility && (
        <FacilityPreviewModal
          facility={selectedFacility}
          previewImage={previewImage}
          onPreviewImageChange={setPreviewImage}
          onClose={() => setSelectedFacility(null)}
          onEdit={() => {
            setSelectedFacility(null);
            handleEdit(selectedFacility);
          }}
        />
      )}
    </div>
  );
}

function FacilityCard({ facility, onView, onEdit, onDelete }) {
  const price = getFacilityPrice(facility);

  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <button
          type="button"
          onClick={onView}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <img
            src={getImageSrc(facility.image_url || getFacilityImages(facility)[0])}
            alt={facility.name}
            className="h-28 w-28 shrink-0 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] object-cover"
            onError={(e) => {
              e.currentTarget.src = FACILITY_FALLBACK;
            }}
          />

          <div className="min-w-0 flex-1">
            <h4 className="safe-text text-xl font-black text-[#0B1F33]">
              {facility.name}
            </h4>

            <p className="safe-text mt-1 text-sm font-bold text-slate-500">
              {facility.type || "Facility"}
            </p>

            <p className="safe-text mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
              {facility.description || "No details provided."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black text-[#B86658]">
                {money(price)} / hour
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                  facility
                )}`}
              >
                {getStatusText(facility)}
              </span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <button type="button" onClick={onView} className="icb-btn-light">
            <Eye size={16} />
            View
          </button>

          <button type="button" onClick={onEdit} className="icb-btn-light">
            <Edit3 size={16} />
            Edit
          </button>

          <button type="button" onClick={onDelete} className="icb-btn-danger">
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function FacilityPreviewModal({
  facility,
  previewImage,
  onPreviewImageChange,
  onClose,
  onEdit,
}) {
  const images = getFacilityImages(facility);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="icb-card max-h-[92vh] w-full max-w-6xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">Facility Preview</p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              {facility.name}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {facility.type || "Facility"}
            </p>
          </div>

          <button type="button" onClick={onClose} className="icb-btn-light">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-4">
            <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto pr-1">
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  onClick={() => onPreviewImageChange(getImageSrc(img))}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border bg-[#FBFAF9] ${
                    previewImage === getImageSrc(img)
                      ? "border-[#C97B6C] ring-2 ring-[#C97B6C]/25"
                      : "border-[#DED8D2]"
                  }`}
                >
                  <img
                    src={getImageSrc(img)}
                    alt={facility.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FACILITY_FALLBACK;
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="relative flex min-h-[520px] items-center justify-center rounded-3xl border border-[#DED8D2] bg-[#FBFAF9]">
              <img
                src={previewImage || getImageSrc(facility.image_url)}
                alt={facility.name}
                className="h-full max-h-[640px] w-full rounded-3xl object-contain p-6"
                onError={(e) => {
                  e.currentTarget.src = FACILITY_FALLBACK;
                }}
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                facility
              )}`}
            >
              {getStatusText(facility)}
            </span>

            <h1 className="safe-text mt-4 text-3xl font-black text-[#0B1F33]">
              {facility.name}
            </h1>

            <p className="mt-2 text-lg font-bold text-slate-500">
              {facility.type || "Facility"}
            </p>

            <p className="mt-5 text-3xl font-black text-[#B86658]">
              {money(getFacilityPrice(facility))} / hour
            </p>

            <p className="mt-5 text-sm font-semibold leading-7 text-slate-600">
              {facility.description || "No facility description yet."}
            </p>

            <div className="mt-8 rounded-3xl border border-[#DED8D2] bg-[#FBFAF9] p-5 text-sm text-[#0B1F33]">
              <PreviewRow
                label="Hourly Rate"
                value={`${money(getFacilityPrice(facility))} / hour`}
              />

              <PreviewRow label="Status" value={getStatusText(facility)} />

              <PreviewRow
                label="Facility Type"
                value={facility.type || "Facility"}
              />

              <PreviewRow
                label="Preview Images"
                value={`${
                  images.filter((img) => img !== FACILITY_FALLBACK).length
                } image(s)`}
              />
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={onEdit}
                className="icb-btn-accent w-full"
              >
                <Edit3 size={17} />
                Edit Facility
              </button>

              <button
                type="button"
                onClick={onClose}
                className="icb-btn-light w-full"
              >
                Close
              </button>
            </div>

            <details className="mt-6 rounded-2xl border border-[#DED8D2] bg-white p-4 text-sm text-[#0B1F33]">
              <summary className="cursor-pointer font-black">
                Facility Details
              </summary>

              <p className="mt-3 font-semibold leading-7 text-slate-600">
                {facility.description || "No additional details."}
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#DED8D2] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="safe-text text-right font-black text-[#0B1F33]">
        {value}
      </span>
    </div>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        className="icb-input"
      />
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone = "coral" }) {
  const toneClasses = {
    coral: "bg-[#F3E4DF] text-[#B86658]",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="safe-text mt-3 text-3xl font-black text-[#0B1F33]">
            {value}
          </h3>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            toneClasses[tone] || toneClasses.coral
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-white backdrop-blur">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
        {label}
      </p>

      <h3 className="safe-text mt-2 text-xl font-black">{value}</h3>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DED8D2] bg-[#FBFAF9] p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}