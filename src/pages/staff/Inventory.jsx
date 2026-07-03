import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { ListSkeleton } from "../../components/ui/Skeleton";
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
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" fill="#64748b">Product</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || PRODUCT_FALLBACK;
}

function getProductImages(product) {
  const images = [...(product?.image_urls || []), product?.image_url].filter(Boolean);
  return images.length ? [...new Set(images)] : [PRODUCT_FALLBACK];
}

export default function Inventory() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

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
        const nextImages = [...new Set([...(prev.image_urls || []), ...uploadedUrls])];

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
    const images = getProductImages(item).filter((img) => img !== PRODUCT_FALLBACK);

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

  function getStatusBadge(item) {
    const quantity = Number(item.quantity || 0);
    const threshold = Number(item.low_stock_threshold || 5);

    if (quantity <= 0) {
      return "bg-red-100 text-red-700";
    }

    if (quantity <= threshold) {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-green-100 text-green-700";
  }

  function getStatusText(item) {
    const quantity = Number(item.quantity || 0);
    const threshold = Number(item.low_stock_threshold || 5);

    if (quantity <= 0) return "Out of Stock";
    if (quantity <= threshold) return "Low Stock";
    return "Available";
  }

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="staff" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Inventory" />

          <div className="mb-6 rounded-[28px] bg-[#C97B6C] from-[#B87463] via-slate-800 to-[#C97B6C] p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">
              Product Inventory
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Manage products with premium image previews.
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">
              Add up to 5 preview pictures per product for a Nike-style shop view.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Card>
              <h2 className="text-2xl font-bold text-black">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <p className="mt-1 mb-6 text-sm text-black">
                Upload up to 5 product preview images.
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
                  placeholder="Product Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <input
                  name="category"
                  placeholder="Category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <textarea
                  name="description"
                  placeholder="Product details / description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    name="price"
                    type="number"
                    placeholder="Price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  />

                  <input
                    name="quantity"
                    type="number"
                    placeholder="Quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                  />
                </div>

                

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-black">
                      Product Images
                    </label>

                    <span className="text-xs font-semibold text-slate-600">
                      {form.image_urls.length}/5 images
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImagesUpload}
                    disabled={form.image_urls.length >= 5}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black disabled:bg-slate-100"
                  />

                  {uploadingImage ? (
                    <p className="text-sm text-black">Uploading images...</p>
                  ) : null}

                  {form.image_urls?.length > 0 ? (
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
                            className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            ×
                          </button>

                          {form.image_url === url ? (
                            <span className="absolute bottom-2 left-2 rounded-full bg-[#C97B6C] px-2 py-1 text-[10px] font-bold text-white">
                              Main
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-black">
                      No product images uploaded yet.
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-[#C97B6C] px-4 py-3 font-semibold text-white transition hover:bg-[#B96A5D] disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Product"
                      : "Add Product"}
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
              <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Products</h2>
                  <p className="mt-1 text-sm text-black">
                    Current merchandise and product inventory.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
                  {items.length} item(s)
                </div>
              </div>

              {loading ? (
                <ListSkeleton />
              ) : items.length === 0 ? (
                <p className="text-black">No products yet.</p>
              ) : (
                <div className="panel-scroll hide-scrollbar space-y-4 pr-2 max-h-[70vh]">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="card-hover rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <button
                          type="button"
                          onClick={() => openProductView(item)}
                          className="flex min-w-0 flex-1 gap-4 text-left"
                        >
                          <img
                            src={getImageSrc(
                              item.image_url || getProductImages(item)[0]
                            )}
                            alt={item.name}
                            className="h-28 w-28 shrink-0 rounded-2xl border object-cover"
                            onError={(e) => {
                              e.currentTarget.src = PRODUCT_FALLBACK;
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="safe-text text-xl font-semibold">
                              {item.name}
                            </p>
                            <p className="safe-text mt-1 text-sm font-medium capitalize">
                              {item.category}
                            </p>
                            <p className="safe-text mt-3 text-sm leading-6">
                              {item.description || "No details provided."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#F3E4DF] px-3 py-1 text-xs font-bold text-[#C97B6C]">
                                ₱ {Number(item.price || 0).toLocaleString()}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Stock: {item.quantity || 0}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(
                                  item
                                )}`}
                              >
                                {getStatusText(item)}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openProductView(item)}
                              className="rounded-xl bg-[#F3E4DF] px-4 py-2 text-sm font-semibold text-[#C97B6C] transition hover:bg-blue-100"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.name)}
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

      {selectedProduct ? (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Product Preview</h2>

              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
              <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-4">
                <div className="flex max-h-[720px] flex-col gap-3 overflow-y-auto pr-1">
                  {getProductImages(selectedProduct).map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setPreviewImage(getImageSrc(img))}
                      className={`h-20 w-20 overflow-hidden rounded-xl border bg-slate-100 ${
                        previewImage === getImageSrc(img)
                          ? "border-black"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={getImageSrc(img)}
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = PRODUCT_FALLBACK;
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="relative flex min-h-[560px] items-center justify-center rounded-2xl bg-[#f3f4f6]">
                  <img
                    src={previewImage || getImageSrc(selectedProduct.image_url)}
                    alt={selectedProduct.name}
                    className="h-full max-h-[680px] w-full rounded-2xl object-contain p-6"
                    onError={(e) => {
                      e.currentTarget.src = PRODUCT_FALLBACK;
                    }}
                  />
                </div>
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <h1 className="text-3xl font-bold text-black">
                  {selectedProduct.name}
                </h1>

                <p className="mt-1 text-lg capitalize text-slate-600">
                  {selectedProduct.category}
                </p>

                <p className="mt-5 text-xl font-bold text-black">
                  ₱{Number(selectedProduct.price || 0).toLocaleString()}
                </p>

                <p className="mt-5 text-sm leading-7 text-black">
                  {selectedProduct.description || "No product description yet."}
                </p>

                <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-black">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span>Stock</span>
                    <span className="font-bold">
                      {selectedProduct.quantity || 0}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 py-3">
                    <span>Status</span>
                    <span className="font-bold">
                      {getStatusText(selectedProduct)}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3">
                    <span>Preview Images</span>
                    <span className="font-bold">
                      {getProductImages(selectedProduct).filter(
                        (img) => img !== PRODUCT_FALLBACK
                      ).length}
                      /5
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      handleEdit(selectedProduct);
                    }}
                    className="w-full rounded-full bg-black px-6 py-5 text-base font-bold text-white transition hover:bg-slate-800"
                  >
                    Edit Product
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="w-full rounded-full border border-slate-300 bg-white px-6 py-5 text-base font-bold text-black transition hover:border-black"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 space-y-4 text-sm text-black">
                  <details className="border-t border-slate-200 pt-4">
                    <summary className="cursor-pointer font-bold">
                      Product Details
                    </summary>
                    <p className="mt-3 leading-7">
                      {selectedProduct.description || "No additional details."}
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}