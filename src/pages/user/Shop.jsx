import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { getInventory } from "../../services/inventoryService";

const PRODUCT_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" fill="#64748b">Product</text>
    </svg>
  `);

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function getImage(url) {
  return url || PRODUCT_FALLBACK;
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getInventory();
      setProducts(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedImage(getImage(product.image_url));
    setSelectedSize("");
  }

  const filteredProducts = useMemo(() => {
    return products.filter((item) =>
      `${item.name} ${item.category} ${item.description || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Shop" />

          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-800 to-blue-700 p-6 text-white md:p-8">
            <p className="text-sm font-medium text-blue-100">
              InCredoBall Store
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Shop sports merchandise.
            </h2>
            <p className="mt-3 text-sm text-slate-100">
              Tap a product to view full details, size options, and price.
            </p>
          </div>

          <Card>
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">Products</h2>
                <p className="mt-1 text-sm text-black">
                  Nike-style product browsing.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none focus:border-blue-500 md:w-80"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-black">No products found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="card-hover overflow-hidden rounded-3xl border border-slate-200 bg-white text-left"
                  >
                    <div className="flex h-72 items-center justify-center bg-slate-100">
                      <img
                        src={getImage(product.image_url)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = PRODUCT_FALLBACK;
                        }}
                      />
                    </div>

                    <div className="p-4">
                      <p className="text-lg font-bold text-black">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm capitalize text-slate-600">
                        {product.category}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-black">
                        {product.description || "No description"}
                      </p>
                      <p className="mt-3 text-base font-bold text-black">
                        ₱{Number(product.price || 0).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Stock: {product.quantity || 0}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {selectedProduct ? (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="modal-card h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Product Details</h2>

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
                  {[
                    selectedProduct.image_url,
                    selectedProduct.image_url,
                    selectedProduct.image_url,
                    selectedProduct.image_url,
                  ].map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(getImage(img))}
                      className={`h-20 w-20 overflow-hidden rounded-xl border bg-slate-100 ${
                        selectedImage === getImage(img)
                          ? "border-black"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={getImage(img)}
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
                    src={selectedImage}
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

                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-bold text-black">Select Size</p>
                    <p className="text-sm font-semibold text-black">
                      📏 Size Guide
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-xl border px-4 py-4 text-base font-semibold transition ${
                          selectedSize === size
                            ? "border-black bg-black text-white"
                            : "border-slate-300 bg-white text-black hover:border-black"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    disabled={
                      !selectedSize || Number(selectedProduct.quantity || 0) <= 0
                    }
                    className="w-full rounded-full bg-black px-6 py-5 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {Number(selectedProduct.quantity || 0) <= 0
                      ? "Out of Stock"
                      : selectedSize
                      ? "Add to Bag"
                      : "Select Size First"}
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-full border border-slate-300 bg-white px-6 py-5 text-base font-bold text-black transition hover:border-black"
                  >
                    Favourite ♡
                  </button>
                </div>

                <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-black">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span>Stock</span>
                    <span className="font-bold">
                      {selectedProduct.quantity || 0}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 py-3">
                    <span>Status</span>
                    <span className="font-bold capitalize">
                      {selectedProduct.status?.replaceAll("_", " ") ||
                        "Available"}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3">
                    <span>Category</span>
                    <span className="font-bold capitalize">
                      {selectedProduct.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}