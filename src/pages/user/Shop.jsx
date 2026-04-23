import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { getInventory } from "../../services/inventoryService";

const PRODUCT_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="28" fill="#64748b">Product</text>
    </svg>
  `);

function getImageSrc(url) {
  return url || PRODUCT_FALLBACK;
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getInventory();
      setProducts((data || []).filter((item) => item.status !== "out_of_stock"));
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = `${item.name} ${item.category} ${item.description || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory = category === "all" ? true : item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  return (
    <div className="page-shell bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Shop" />

          <div className="mb-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 text-white">
            <div className="grid grid-cols-1 gap-6 p-8 md:p-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
              <div>
                <p className="text-sm font-medium text-slate-300">
                  InCredoBall Merchandise
                </p>
                <h2 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
                  Built for athletes. Styled like a real shop.
                </h2>
                <p className="mt-4 max-w-2xl text-sm text-slate-200 md:text-base">
                  Browse sports merchandise, accessories, and training essentials.
                  Click any product to view full details.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Available Products
                </p>
                <p className="mt-2 text-4xl font-bold">{products.length}</p>
                <p className="mt-1 text-sm text-slate-200">
                  Updated from live inventory
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-black">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="w-full lg:w-64">
                <label className="mb-2 block text-sm font-medium text-black">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-black outline-none transition focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {loading ? (
            <Card>
              <p className="text-black">Loading products...</p>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <p className="text-black">No products found.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProduct(item)}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                >
                  <div className="h-72 bg-slate-100">
                    <img
                      src={getImageSrc(item.image_url)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = PRODUCT_FALLBACK;
                      }}
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-black">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm capitalize text-slate-600">
                          {item.category}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          item.status === "in_stock"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {item.status?.replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm text-slate-700">
                      {item.description || "No description available."}
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <p className="text-xl font-bold text-black">
                        ₱ {item.price || 0}
                      </p>
                      <span className="text-sm text-slate-600">
                        Stock: {item.quantity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-[32px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600">Product Details</p>
                <h2 className="mt-1 text-3xl font-bold text-black">
                  {selectedProduct.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-black hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[520px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[28px] bg-slate-100">
                <img
                  src={getImageSrc(selectedProduct.image_url)}
                  alt={selectedProduct.name}
                  className="h-[480px] w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = PRODUCT_FALLBACK;
                  }}
                />
              </div>

              <div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {selectedProduct.category}
                </span>

                <p className="mt-5 text-3xl font-bold text-black">
                  ₱ {selectedProduct.price || 0}
                </p>

                <p className="mt-5 text-sm leading-7 text-black">
                  {selectedProduct.description || "No description available for this product yet."}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Stock
                    </p>
                    <p className="mt-1 text-xl font-bold text-black">
                      {selectedProduct.quantity || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status
                    </p>
                    <p className="mt-1 text-xl font-bold text-black capitalize">
                      {(selectedProduct.status || "unknown").replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <button
                  className="mt-8 w-full rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="button"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}