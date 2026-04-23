import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToBucket } from "../../services/storageService";
import {
  getInventory,
  createInventoryItem,
  updateInventory,
} from "../../services/inventoryService";

export default function Inventory() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "merchandise",
    description: "",
    image_url: "",
    price: "",
    quantity: "",
    min_threshold: "5",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await getInventory();
      setItems(data || []);
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError("");
      const url = await uploadImageToBucket(file, "product-images", "merchandise");

      setForm((prev) => ({
        ...prev,
        image_url: url,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      category: item.category || "merchandise",
      description: item.description || "",
      image_url: item.image_url || "",
      price: item.price || "",
      quantity: item.quantity || "",
      min_threshold: item.min_threshold || "5",
    });
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      category: "merchandise",
      description: "",
      image_url: "",
      price: "",
      quantity: "",
      min_threshold: "5",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        image_url: form.image_url,
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 0),
        min_threshold: Number(form.min_threshold || 5),
        created_by: user?.id || null,
        updated_by: user?.id || null,
      };

      if (editingId) {
        await updateInventory(editingId, payload);
        setMessage("Product updated successfully.");
      } else {
        await createInventoryItem(payload);
        setMessage("Product added successfully.");
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStock(id, quantity, minThreshold = 5) {
    try {
      await updateInventory(id, {
        quantity,
        min_threshold: minThreshold,
        updated_by: user?.id || null,
      });
      await load();
    } catch (err) {
      setError(err.message || "Failed to update stock.");
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) =>
      `${item.name} ${item.category} ${item.description || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="flex-1 h-screen overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="mx-auto h-full max-w-[1600px] overflow-hidden">
          <Topbar title="Inventory" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-blue-800 to-blue-600 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.2)] md:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Merchandise Inventory
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Manage products, images, stock, and pricing.
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
                Upload product images, edit details, and keep your shop catalog clean and complete.
              </p>
            </div>
          </div>

          <div className="grid h-[calc(100%-190px)] grid-cols-1 gap-6 2xl:grid-cols-[420px_minmax(900px,1fr)]">
            <Card className="panel-scroll hide-scrollbar">
              <h2 className="text-2xl font-bold text-black">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <p className="mt-1 mb-6 text-sm text-black">
                Add merchandise details with image, price, and stock.
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
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Product name"
                />

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="merchandise">Merchandise</option>
                  <option value="equipment">Equipment</option>
                  <option value="accessories">Accessories</option>
                </select>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-black">
                    Product Image
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
                      src={form.image_url}
                      alt="Product preview"
                      className="h-36 w-36 rounded-2xl border object-cover"
                    />
                  ) : null}
                </div>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Product description"
                />

                <input
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Price"
                />

                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Quantity"
                />

                <input
                  name="min_threshold"
                  type="number"
                  min="0"
                  value={form.min_threshold}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  placeholder="Low stock threshold"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
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
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Products</h2>
                  <p className="mt-1 text-sm text-black">
                    Manage your shop products and stock levels.
                  </p>
                </div>

                <input
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full lg:w-80 rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              {loading ? (
                <p className="text-black">Loading products...</p>
              ) : filtered.length === 0 ? (
                <p className="text-black">No products found.</p>
              ) : (
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      className="card-list-item rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <img
                            src={
                              item.image_url ||
                              "https://via.placeholder.com/160x160?text=Product"
                            }
                            alt={item.name}
                            className="h-24 w-24 shrink-0 rounded-2xl border object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="safe-text text-lg font-semibold">
                              {item.name}
                            </p>
                            <p className="safe-text mt-1 text-sm font-medium capitalize">
                              {item.category}
                            </p>
                            <p className="safe-text mt-2 text-sm leading-6">
                              {item.description || "No description"}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-blue-700">
                              ₱ {item.price || 0}
                            </p>
                            <p className="safe-text mt-1 text-sm">
                              Stock: {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 xl:items-end">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                updateStock(
                                  item.id,
                                  Math.max(0, Number(item.quantity || 0) - 1),
                                  item.min_threshold || 5
                                )
                              }
                              className="rounded-xl bg-red-500 px-3 py-2 text-white"
                            >
                              -
                            </button>

                            <button
                              onClick={() =>
                                updateStock(
                                  item.id,
                                  Number(item.quantity || 0) + 1,
                                  item.min_threshold || 5
                                )
                              }
                              className="rounded-xl bg-green-600 px-3 py-2 text-white"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                          >
                            Edit
                          </button>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              item.status === "in_stock"
                                ? "bg-green-100 text-green-700"
                                : item.status === "low_stock"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.status?.replaceAll("_", " ")}
                          </span>
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