import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from "../../services/facilityService";

export default function FacilityControl() {
  const { user } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
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

  function handleEdit(facility) {
    setEditingId(facility.id);
    setForm({
      name: facility.name || "",
      type: facility.type || "",
      description: facility.description || "",
      price: facility.price || "",
      is_active: facility.is_active ?? true,
    });
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      type: "",
      description: "",
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
        price: Number(form.price || 0),
        is_active: form.is_active,
        updated_by: user?.id || null,
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

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this facility?");
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      await deleteFacility(id, user?.id || null);
      setMessage("Facility deleted successfully.");
      await loadFacilities();
    } catch (err) {
      setError(err.message || "Failed to delete facility.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="admin" />

      <main className="flex-1 h-screen overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="mx-auto h-full max-w-[1600px] overflow-hidden">
          <Topbar title="Facility Control" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] md:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Facility Management
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Create and manage sports facilities.
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Control facility details, pricing, descriptions, and availability
                from one admin workspace.
              </p>
            </div>
          </div>

          <div className="grid h-[calc(100%-190px)] grid-cols-1 gap-6 2xl:grid-cols-[420px_minmax(1000px,1fr)]">
            <Card className="panel-scroll hide-scrollbar">
              <h2 className="text-2xl font-bold text-black">
                {editingId ? "Edit Facility" : "Add Facility"}
              </h2>
              <p className="mt-1 mb-6 text-sm text-black">
                Add full facility information including price and details.
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
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:opacity-60"
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

            <Card className="flex min-h-0 flex-col">
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
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2">
                  {facilities.map((facility) => (
                    <div
                      key={facility.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="safe-text text-xl font-semibold">
                            {facility.name}
                          </p>
                          <p className="safe-text mt-1 text-sm font-medium">
                            {facility.type}
                          </p>
                          <p className="safe-text mt-3 text-sm leading-6">
                            {facility.description || "No details provided."}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-blue-700">
                            ₱ {facility.price || 0}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              facility.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-black"
                            }`}
                          >
                            {facility.is_active ? "Active" : "Inactive"}
                          </span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(facility)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(facility.id)}
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
    </div>
  );
}