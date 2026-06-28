import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import LandingLayout from "./LandingLayout";
import { supabase } from "../../services/supabaseClient";

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="38" font-weight="700" fill="#64748b">Product</text>
    </svg>
  `);

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}.00`;
}

function getImages(product) {
  const images = [
    ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
    product?.image_url,
  ].filter(Boolean);

  const uniqueImages = [...new Set(images)];
  return uniqueImages.length ? uniqueImages : [FALLBACK];
}

function stockLabel(product) {
  const qty = Number(product.quantity || 0);

  if (qty <= 0) {
    return {
      label: "Out of stock",
      dot: "bg-slate-600",
      badge: "Out of stock",
      badgeClass: "border-slate-300 text-slate-700",
    };
  }

  if (qty <= 5) {
    return {
      label: "Low stock",
      dot: "bg-[#B8324B]",
      badge: "Low stock",
      badgeClass: "border-[#B8324B] text-[#B8324B]",
    };
  }

  return {
    label: "Available",
    dot: "bg-[#168A7A]",
    badge: "",
    badgeClass: "",
  };
}

export default function PublicShop() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const productCount = useMemo(() => products.length, [products]);

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("public-inventory-products")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => loadProducts(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadProducts(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const { data, error: inventoryError } = await supabase
        .from("inventory")
        .select(
          "id, name, category, description, image_url, image_urls, price, quantity, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (inventoryError) throw inventoryError;

      setProducts(data || []);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Failed to load products. Please check inventory public access."
      );
    } finally {
      setLoading(false);
    }
  }

  function openProduct(product) {
    setSelected(product);
    setActiveImage(getImages(product)[0]);
  }

  function closeProduct() {
    setSelected(null);
    setActiveImage("");
  }

  return (
    <LandingLayout>
      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-16">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Products Offered
            </p>

            <h1 className="mt-3 text-5xl font-black">ICB Sports Products</h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              View the sports merchandise and equipment offered by InCredoBall.
              Products are displayed for information only.
            </p>
          </div>

          <div className="rounded-2xl border border-[#DED8D2] bg-white px-5 py-3 text-sm font-bold text-slate-700">
            {productCount} product(s)
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[32px] border border-[#DED8D2] bg-white p-10 text-center font-bold text-slate-500">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[32px] border border-[#DED8D2] bg-white p-10 text-center font-bold text-slate-500">
            No products available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const stock = stockLabel(product);
              const images = getImages(product);

              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => openProduct(product)}
                  className="group relative rounded-[24px] border border-[#DED8D2] bg-white p-5 text-left shadow-sm transition hover:shadow-xl"
                >
                  {stock.badge && (
                    <span
                      className={`absolute left-5 top-5 z-10 rounded-xl border bg-white px-3 py-2 text-xs font-black ${stock.badgeClass}`}
                    >
                      {stock.badge}
                    </span>
                  )}

                  <div className="flex h-[280px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                    <img
                      src={images[0]}
                      alt={product.name || "Product"}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK;
                      }}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {product.category || "Merchandise"}
                    </p>

                    <h3 className="mt-2 min-h-[48px] text-lg font-black leading-6 text-[#2B2B2B]">
                      {product.name || "Unnamed Product"}
                    </h3>

                    <p className="mt-2 text-2xl font-black text-[#2B2B2B]">
                      {money(product.price)}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <span className={`h-3 w-3 rounded-full ${stock.dot}`} />
                      <span>{stock.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <ProductModal
          product={selected}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
          onClose={closeProduct}
        />
      )}
    </LandingLayout>
  );
}

function ProductModal({ product, activeImage, setActiveImage, onClose }) {
  const images = getImages(product);
  const stock = stockLabel(product);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-7 top-7 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-[#6E8A95] text-white"
      >
        <X size={26} />
      </button>

      <div className="ml-auto h-full w-full max-w-[960px] overflow-y-auto bg-[#F5F7F8] p-4 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4">
              <img
                src={activeImage || images[0]}
                alt={product.name || "Product"}
                className="h-[420px] w-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK;
                }}
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-2 gap-4">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`rounded-2xl bg-white p-3 ${
                      activeImage === image ? "ring-2 ring-[#C97B6C]" : ""
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name || "Product"} ${index + 1}`}
                      className="h-52 w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-8">
            <p className="text-sm text-slate-400">
              {product.category || "InCredoBall"}
            </p>

            <h2 className="mt-3 text-4xl font-black leading-tight text-black">
              {product.name || "Unnamed Product"}
            </h2>

            <p className="mt-4 text-4xl font-black text-black">
              {money(product.price)}
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-4 w-4 rounded-full ${stock.dot}`} />
              <span>{stock.label}</span>
            </div>

            <div className="mt-8 text-[15px] leading-7 text-slate-700">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p>No product details provided.</p>
              )}
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-black text-black">Product Details</h3>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  <b>Category:</b> {product.category || "Merchandise"}
                </p>

                <p>
                  <b>Stock:</b> {Number(product.quantity || 0)}
                </p>

                <p>
                  <b>Status:</b> {stock.label}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-[#F3E4DF] p-5 text-sm font-semibold text-[#C97B6C]">
              This page is for product viewing only. No add to cart or checkout
              function is available.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}