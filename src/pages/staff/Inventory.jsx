// src/pages/staff/Inventory.jsx

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Edit3,
  Eye,
  ImagePlus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToBucket } from "../../services/storageService";
import {
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} from "../../services/inventoryService";

const PRODUCT_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <circle cx="300" cy="245" r="72" fill="#e2e8f0"/>
      <rect x="188" y="345" width="224" height="34" rx="17" fill="#cbd5e1"/>
      <text x="50%" y="73%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="24" font-weight="700" fill="#64748b">Product</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || PRODUCT_FALLBACK;
}

function getProductImages(product) {
  const images = [...(product?.image_urls || []), product?.image_url].filter(
    Boolean
  );

  return images.length ? [...new Set(images)] : [PRODUCT_FALLBACK];
}

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function getStatusText(item) {
  const quantity = Number(item.quantity || 0);
  const threshold = Number(item.low_stock_threshold || 5);

  if (quantity <= 0) return "Out of Stock";
  if (quantity <= threshold) return "Low Stock";

  return "Available";
}

function getStatusBadge(item) {
  const quantity = Number(item.quantity || 0);
  const threshold = Number(item.low_stock_threshold || 5);

  if (quantity <= 0) return "bg-red-100 text-red-700";
  if (quantity <= threshold) return "bg-amber-100 text-amber-700";

  return "bg-green-100 text-green-700";
}

export default function Inventory() {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "merchandise",
    description: "",
    image_url: "",
    image_urls: [],
    price: "",
    quantity: "",
  });

  const categories = useMemo(() => {
    const values = items
      .map((item) => String(item.category || "").trim())
      .filter(Boolean);

    return ["all", ...new Set(values)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const text = [
        item.name,
        item.category,
        item.description,
        item.price,
        item.quantity,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search.trim() === "" || text.includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        String(item.category || "").toLowerCase() ===
          String(categoryFilter).toLowerCase();

      const status = getStatusText(item).toLowerCase().replaceAll(" ", "_");

      const matchesStock = stockFilter === "all" || stockFilter === status;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  const summary = useMemo(() => {
    const totalStock = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    const totalValue = items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);

    const lowStock = items.filter((item) => {
      const quantity = Number(item.quantity || 0);
      const threshold = Number(item.low_stock_threshold || 5);

      return quantity > 0 && quantity <= threshold;
    }).length;

    const outOfStock = items.filter(
      (item) => Number(item.quantity || 0) <= 0
    ).length;

    return {
      totalItems: items.length,
      totalStock,
      totalValue,
      lowStock,
      outOfStock,
    };
  }, [items]);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
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

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadInventory();
    } finally {
      setRefreshing(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleMultipleImagesUpload(e) {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const currentCount = form.image_urls?.length || 0;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      setError("Maximum of 5 product preview images only.");
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    try {
      setUploadingImage(true);
      setError("");

      const uploadedUrls = [];

      for (const file of filesToUpload) {
        const url = await uploadImageToBucket(
          file,
          "product-images",
          "products"
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
          image_urls: nextImages.slice(0, 5),
        };
      });

      if (files.length > remainingSlots) {
        setMessage(`Only ${remainingSlots} image(s) were added. Maximum is 5.`);
      }
    } catch (err) {
      setError(err.message || "Failed to upload product images.");
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

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      category: "merchandise",
      description: "",
      image_url: "",
      image_urls: [],
      price: "",
      quantity: "",
    });
  }

  function handleEdit(item) {
    const images = getProductImages(item).filter(
      (img) => img !== PRODUCT_FALLBACK
    );

    setEditingId(item.id);
    setForm({
      name: item.name || "",
      category: item.category || "merchandise",
      description: item.description || "",
      image_url: item.image_url || images[0] || "",
      image_urls: images.slice(0, 5),
      price: item.price || "",
      quantity: item.quantity || "",
    });

    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProductView(item) {
    setSelectedProduct(item);
    setPreviewImage(getImageSrc(item.image_url || getProductImages(item)[0]));
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

      const cleanImages = [...new Set(form.image_urls || [])].slice(0, 5);

      const payload = {
        name: form.name.trim(),
        category: form.category || "merchandise",
        description: form.description.trim(),
        image_url: form.image_url || cleanImages[0] || "",
        image_urls: cleanImages,
        price: Number(form.price || 0),
        quantity: Number(form.quantity || 0),
        updated_by: user?.id || null,
        ...(editingId ? {} : { created_by: user?.id || null }),
      };

      if (editingId) {
        await updateInventory(editingId, payload);
        setMessage("Product updated successfully.");
      } else {
        await createInventory(payload);
        setMessage("Product added successfully.");
      }

      resetForm();
      await loadInventory();
    } catch (err) {
      setError(err.message || "Failed to save product.");
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

      await deleteInventory(id);

      setMessage("Product deleted successfully.");

      if (editingId === id) resetForm();

      await loadInventory();
    } catch (err) {
      setError(err.message || "Failed to delete product.");
    }
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
  }

  return (
    <div className="page-shell">
      <Sidebar
        role="staff"
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="page-main">
        <div className="page-container">
          <Topbar
            title="Inventory"
            subtitle="Manage sports center products, stock levels, and product previews."
            showMenuButton
            onMenuClick={() => setSidebarOpen(true)}
          />

          {error && <div className="icb-alert-error mb-5">{error}</div>}

          {message && <div className="icb-alert-success mb-5">{message}</div>}

          <section className="page-hero mb-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#E8A093]">
                  Product Inventory
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Manage products with clean stock monitoring.
                </h2>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                  Add products, upload up to five preview images, update prices,
                  and monitor low stock or out-of-stock items in one organized
                  staff workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Products" value={summary.totalItems} />
                <HeroStat label="Stock" value={summary.totalStock} />
                <HeroStat label="Low Stock" value={summary.lowStock} />
                <HeroStat label="Value" value={money(summary.totalValue)} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total Products"
              value={summary.totalItems}
              description="Inventory records"
              icon={<Package size={22} />}
              tone="coral"
            />

            <MetricCard
              title="Total Stock"
              value={summary.totalStock}
              description="Available quantity"
              icon={<Boxes size={22} />}
              tone="blue"
            />

            <MetricCard
              title="Inventory Value"
              value={money(summary.totalValue)}
              description="Price × quantity"
              icon={<Package size={22} />}
              tone="green"
            />

            <MetricCard
              title="Low Stock"
              value={summary.lowStock}
              description="Needs attention"
              icon={<AlertTriangle size={22} />}
              tone="amber"
            />

            <MetricCard
              title="Out of Stock"
              value={summary.outOfStock}
              description="Unavailable items"
              icon={<AlertTriangle size={22} />}
              tone="red"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
            <section className="icb-card p-5 sm:p-6">
              <div className="mb-6">
                <p className="icb-eyebrow">Inventory Form</p>

                <h3 className="icb-section-title mt-2">
                  {editingId ? "Edit Product" : "Add Product"}
                </h3>

                <p className="icb-section-subtitle">
                  Upload product images and keep product details updated.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Product Name"
                  name="name"
                  placeholder="Product Name"
                  value={form.name}
                  onChange={handleChange}
                />

                <FormInput
                  label="Category"
                  name="category"
                  placeholder="Category"
                  value={form.category}
                  onChange={handleChange}
                />

                <div>
                  <label className="icb-label">Description</label>

                  <textarea
                    name="description"
                    placeholder="Product details / description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    className="icb-textarea"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Price"
                    name="price"
                    type="number"
                    placeholder="Price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                  />

                  <FormInput
                    label="Quantity"
                    name="quantity"
                    type="number"
                    placeholder="Quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className="rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <label className="icb-label mb-0">Product Images</label>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Upload up to 5 preview images.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black text-[#B86658]">
                      {form.image_urls.length}/5
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
                      disabled={form.image_urls.length >= 5 || uploadingImage}
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
                              alt="Product"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = PRODUCT_FALLBACK;
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
                      No product images uploaded yet.
                    </div>
                  )}
                </div>

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
                      ? "Update Product"
                      : "Add Product"}
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
                  <p className="icb-eyebrow">Inventory List</p>

                  <h3 className="icb-section-title mt-2">Products</h3>

                  <p className="icb-section-subtitle">
                    {filteredItems.length} of {items.length} product
                    {items.length === 1 ? "" : "s"} shown.
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
                      placeholder="Search product, category, or description"
                      className="icb-input pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="icb-label">Category</label>

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="icb-select"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all" ? "All Categories" : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="icb-label">Stock Status</label>

                  <select
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value)}
                    className="icb-select"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
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
              ) : filteredItems.length === 0 ? (
                <EmptyState text="No products found." />
              ) : (
                <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
                  {filteredItems.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      onView={() => openProductView(item)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item.id, item.name)}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      {selectedProduct && (
        <ProductPreviewModal
          product={selectedProduct}
          previewImage={previewImage}
          onPreviewImageChange={setPreviewImage}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => {
            setSelectedProduct(null);
            handleEdit(selectedProduct);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ item, onView, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-[#DED8D2] bg-white p-4 transition hover:border-[#C97B6C]/40 hover:bg-[#FBFAF9] hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <button
          type="button"
          onClick={onView}
          className="flex min-w-0 flex-1 gap-4 text-left"
        >
          <img
            src={getImageSrc(item.image_url || getProductImages(item)[0])}
            alt={item.name}
            className="h-28 w-28 shrink-0 rounded-2xl border border-[#DED8D2] bg-[#FBFAF9] object-cover"
            onError={(e) => {
              e.currentTarget.src = PRODUCT_FALLBACK;
            }}
          />

          <div className="min-w-0 flex-1">
            <h4 className="safe-text text-xl font-black text-[#0B1F33]">
              {item.name}
            </h4>

            <p className="safe-text mt-1 text-sm font-bold capitalize text-slate-500">
              {item.category || "Uncategorized"}
            </p>

            <p className="safe-text mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
              {item.description || "No details provided."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-black text-[#B86658]">
                {money(item.price)}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                Stock: {item.quantity || 0}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${getStatusBadge(
                  item
                )}`}
              >
                {getStatusText(item)}
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

function ProductPreviewModal({
  product,
  previewImage,
  onPreviewImageChange,
  onClose,
  onEdit,
}) {
  const images = getProductImages(product);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="icb-card max-h-[92vh] w-full max-w-6xl overflow-y-auto p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="icb-eyebrow">Product Preview</p>

            <h2 className="mt-2 text-2xl font-black text-[#0B1F33]">
              {product.name}
            </h2>

            <p className="mt-1 text-sm font-semibold capitalize text-slate-500">
              {product.category || "Uncategorized"}
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
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = PRODUCT_FALLBACK;
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="relative flex min-h-[520px] items-center justify-center rounded-3xl border border-[#DED8D2] bg-[#FBFAF9]">
              <img
                src={previewImage || getImageSrc(product.image_url)}
                alt={product.name}
                className="h-full max-h-[640px] w-full rounded-3xl object-contain p-6"
                onError={(e) => {
                  e.currentTarget.src = PRODUCT_FALLBACK;
                }}
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusBadge(
                product
              )}`}
            >
              {getStatusText(product)}
            </span>

            <h1 className="safe-text mt-4 text-3xl font-black text-[#0B1F33]">
              {product.name}
            </h1>

            <p className="mt-2 text-lg font-bold capitalize text-slate-500">
              {product.category || "Uncategorized"}
            </p>

            <p className="mt-5 text-3xl font-black text-[#B86658]">
              {money(product.price)}
            </p>

            <p className="mt-5 text-sm font-semibold leading-7 text-slate-600">
              {product.description || "No product description yet."}
            </p>

            <div className="mt-8 rounded-3xl border border-[#DED8D2] bg-[#FBFAF9] p-5 text-sm text-[#0B1F33]">
              <PreviewRow label="Stock" value={product.quantity || 0} />
              <PreviewRow label="Status" value={getStatusText(product)} />
              <PreviewRow
                label="Preview Images"
                value={`${
                  images.filter((img) => img !== PRODUCT_FALLBACK).length
                }/5`}
              />
            </div>

            <div className="mt-8 space-y-3">
              <button type="button" onClick={onEdit} className="icb-btn-accent w-full">
                <Edit3 size={17} />
                Edit Product
              </button>

              <button type="button" onClick={onClose} className="icb-btn-light w-full">
                Close
              </button>
            </div>

            <details className="mt-6 rounded-2xl border border-[#DED8D2] bg-white p-4 text-sm text-[#0B1F33]">
              <summary className="cursor-pointer font-black">
                Product Details
              </summary>

              <p className="mt-3 font-semibold leading-7 text-slate-600">
                {product.description || "No additional details."}
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
    <div className="flex justify-between border-b border-[#DED8D2] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-black text-[#0B1F33]">{value}</span>
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
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="icb-card icb-card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <h3 className="safe-text mt-3 text-2xl font-black text-[#0B1F33]">
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