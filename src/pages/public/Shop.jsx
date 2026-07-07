// src/pages/public/Shop.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import LandingLayout from "./LandingLayout";
import heroImage from "../../assets/landing/hero.jpg";
import pickleballImage from "../../assets/landing/pickleball.jpg";
import { getInventory } from "../../services/inventoryService";
import { supabase } from "../../services/supabaseClient";

const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="700">
      <rect width="100%" height="100%" fill="#F5F3F1"/>
      <circle cx="350" cy="260" r="105" fill="#F3E4DF"/>
      <rect x="240" y="380" width="220" height="44" rx="22" fill="#C97B6C"/>
      <rect x="270" y="450" width="160" height="30" rx="15" fill="#0B1F33"/>
      <text x="50%" y="76%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="26" font-weight="700" fill="#64748B">Product Item</text>
    </svg>
  `);

const services = [
  {
    title: "Product Showcase",
    text: "Staff-added inventory items appear here automatically for customers to view.",
  },
  {
    title: "Ask Staff",
    text: "Customers can contact staff to confirm availability, final price, and stock.",
  },
  {
    title: "No Checkout",
    text: "This page is for product viewing only and does not include cart checkout.",
  },
];

function formatPeso(value) {
  const amount = Number(value || 0);

  if (!amount) return "Ask staff";

  return `₱${amount.toLocaleString()}`;
}

function formatCategory(value) {
  return String(value || "Product")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getProductImages(product) {
  const images = [
    ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
    product?.image_url,
  ].filter(Boolean);

  return images.length ? [...new Set(images)] : [PRODUCT_PLACEHOLDER];
}

function getStockLabel(quantity) {
  const qty = Number(quantity || 0);

  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";

  return "Available";
}

function getStockClass(quantity) {
  const qty = Number(quantity || 0);

  if (qty <= 0) return "bg-red-100 text-red-700";
  if (qty <= 5) return "bg-amber-100 text-amber-700";

  return "bg-green-100 text-green-700";
}

export default function Shop() {
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setError("");
      setLoading(true);

      const data = await getInventory();
      setItems(data || []);
    } catch (err) {
      setError(err.message || "Failed to load products.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("public-shop-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(items.map((item) => formatCategory(item.category))),
    ].filter(Boolean);

    return ["All", ...uniqueCategories];
  }, [items]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return items;

    return items.filter(
      (item) => formatCategory(item.category) === selectedCategory
    );
  }, [items, selectedCategory]);

  return (
    <LandingLayout>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-[#0B1F33] text-white">
        <img
          src={pickleballImage || heroImage}
          alt="InCredoBall products"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33] via-[#0B1F33]/90 to-[#0B1F33]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(201,123,108,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.13),transparent_25%)]" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute left-[-130px] top-16 h-[420px] w-[420px] rounded-full border-[28px] border-white" />
          <div className="absolute bottom-[-160px] right-[-150px] h-[520px] w-[520px] rounded-full border-[34px] border-white" />
          <div className="absolute left-[52%] top-0 h-full w-px bg-white" />
        </div>

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#E8A093] backdrop-blur">
              <ShoppingBag size={15} />
              Staff Product Showcase
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Gear up.
              <span className="block text-[#E8A093]">Play better.</span>
              Stay ready.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/78">
              Browse products added by staff from the inventory module. This
              page displays product information, images, prices, and stock
              status for customers.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#products"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-8 py-4 font-black text-white shadow-[0_16px_35px_rgba(201,123,108,0.32)] transition hover:-translate-y-0.5 hover:bg-[#B86658]"
              >
                View Products
                <ArrowRight size={18} />
              </a>

              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Ask Availability
              </Link>
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[30px] bg-white p-6 text-[#0B1F33] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#F3E4DF] text-[#B86658]">
                  <Trophy size={30} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C97B6C]">
                    Live Inventory
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Product Showcase
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                    Products shown here are pulled directly from staff inventory.
                    Customers can view but cannot checkout from this page.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniStat value={items.length} label="Products" />
                <MiniStat value={categories.length - 1} label="Categories" />
                <MiniStat value="View" label="Showcase Only" />
                <MiniStat value="Staff" label="Managed" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="products"
        className="relative overflow-hidden bg-[#F5F3F1] px-6 py-20"
      >
        <div className="absolute left-[-140px] top-24 h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[#0B1F33]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
                Product Inventory
              </p>

              <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-6xl">
                Staff-added products.
              </h2>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                Items added by staff in inventory are automatically displayed
                here for customers.
              </p>
            </div>

            <div className="rounded-3xl border border-[#DED8D2] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4DF] text-[#B86658]">
                  <Star size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Current View
                  </p>

                  <p className="text-sm font-black text-[#0B1F33]">
                    {filteredProducts.length} product item
                    {filteredProducts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="mb-8 flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-5 py-3 text-sm font-black transition ${
                  selectedCategory === category
                    ? "bg-[#C97B6C] text-white shadow-[0_12px_28px_rgba(201,123,108,0.22)]"
                    : "border border-[#DED8D2] bg-white text-[#0B1F33] hover:border-[#C97B6C]/40 hover:bg-[#FFF8F6]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[34px] border border-[#DED8D2] bg-white">
              <div className="text-center">
                <Loader2
                  size={34}
                  className="mx-auto animate-spin text-[#C97B6C]"
                />
                <p className="mt-4 font-black text-[#0B1F33]">
                  Loading products...
                </p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[34px] border border-[#DED8D2] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F3E4DF] text-[#B86658]">
                <Package size={30} />
              </div>

              <h3 className="mt-5 text-3xl font-black text-[#0B1F33]">
                No products yet.
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-600">
                Products added by staff in the inventory module will appear here
                automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id || product.name}
                  product={product}
                  onView={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-20">
        <div className="absolute right-[-140px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#C97B6C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Product Support
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0B1F33] md:text-5xl">
              Simple help for customers.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              Customers can view products online and contact staff for
              availability, pricing, and stock concerns.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="group rounded-[30px] border border-[#DED8D2] bg-[#F5F3F1] p-8 transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:bg-white hover:shadow-2xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C97B6C] text-lg font-black text-white transition group-hover:bg-[#0B1F33]">
                  {index + 1}
                </div>

                <h3 className="mt-6 text-2xl font-black text-[#0B1F33]">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                  {service.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B1F33] px-6 py-20 text-white">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#C97B6C]/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#E8A093]">
              Important Note
            </p>

            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              Product showcase only.
            </h2>

            <p className="mt-4 max-w-2xl font-semibold leading-8 text-white/70">
              This page displays product information from staff inventory. It
              does not process cart checkout or online product payment.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-7 py-4 text-sm font-black text-white transition hover:bg-white hover:text-[#0B1F33]"
              >
                Contact Staff
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/facilities"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                View Facilities
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile
              icon={Eye}
              title="View Products"
              text="Browse staff-added product information."
            />
            <InfoTile
              icon={ShieldCheck}
              title="Ask Staff"
              text="Confirm availability and final prices."
            />
            <InfoTile
              icon={Trophy}
              title="Player Gear"
              text="Products support pickleball and sports play."
            />
            <InfoTile
              icon={Package}
              title="No Cart"
              text="This page does not process checkout."
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#C97B6C] p-8 text-center text-white shadow-2xl md:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#0B1F33]/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
              <ShoppingBag size={30} />
            </div>

            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black">
              Need products or accessories?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl font-semibold leading-8 text-white/85">
              Contact InCredoBall Sports staff or visit the facility to ask
              about product availability.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-[#C97B6C] transition hover:bg-[#0B1F33] hover:text-white"
              >
                Contact Us
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/register"
                className="rounded-2xl border border-white/30 px-8 py-4 font-black text-white transition hover:bg-white/10"
              >
                Book Facility
              </Link>
            </div>
          </div>
        </div>
      </section>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </LandingLayout>
  );
}

function ProductCard({ product, onView }) {
  const images = getProductImages(product);
  const stockLabel = getStockLabel(product?.quantity);

  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#DED8D2] bg-white shadow-sm transition hover:-translate-y-2 hover:border-[#C97B6C]/40 hover:shadow-2xl">
      <div className="relative h-56 overflow-hidden bg-[#F5F3F1]">
        <img
          src={images[0]}
          alt={product?.name || "Product"}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = PRODUCT_PLACEHOLDER;
          }}
        />

        <div className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-xs font-black text-[#C97B6C] shadow-sm">
          {formatCategory(product?.category)}
        </div>

        <div
          className={`absolute bottom-4 right-4 rounded-2xl px-4 py-2 text-xs font-black shadow ${getStockClass(
            product?.quantity
          )}`}
        >
          {stockLabel}
        </div>
      </div>

      <div className="p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C97B6C]">
          {formatCategory(product?.category)}
        </p>

        <h3 className="mt-2 text-2xl font-black text-[#0B1F33]">
          {product?.name || "Product Item"}
        </h3>

        <p className="mt-2 text-lg font-black text-[#B86658]">
          {formatPeso(product?.price)}
        </p>

        <p className="mt-3 min-h-[78px] text-sm font-semibold leading-6 text-slate-600">
          {product?.description || "Product information is available from staff."}
        </p>

        <button
          type="button"
          onClick={onView}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1F33] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C]"
        >
          <Eye size={16} />
          View Details
        </button>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose }) {
  const [activeImage, setActiveImage] = useState(getProductImages(product)[0]);

  if (!product) return null;

  const images = getProductImages(product);
  const stockLabel = getStockLabel(product.quantity);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[34px] border border-[#DED8D2] bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-[0.22em] text-[#C97B6C]">
              Product Details
            </p>

            <h2 className="mt-2 text-3xl font-black text-[#0B1F33]">
              {product.name || "Product Item"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DED8D2] bg-white text-[#0B1F33] transition hover:bg-[#FFF8F6]"
          >
            <X size={21} />
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="overflow-hidden rounded-[30px] border border-[#DED8D2] bg-[#F5F3F1] p-5">
              <img
                src={activeImage}
                alt={product.name || "Product"}
                className="h-[420px] w-full rounded-[24px] object-cover"
                onError={(event) => {
                  event.currentTarget.src = PRODUCT_PLACEHOLDER;
                }}
              />
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`h-20 overflow-hidden rounded-2xl border ${
                      activeImage === image
                        ? "border-[#C97B6C]"
                        : "border-[#DED8D2]"
                    }`}
                  >
                    <img
                      src={image}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="w-fit rounded-full bg-[#F3E4DF] px-4 py-2 text-sm font-black text-[#B86658]">
              {formatCategory(product.category)}
            </p>

            <h3 className="mt-4 text-4xl font-black text-[#0B1F33]">
              {product.name || "Product Item"}
            </h3>

            <p className="mt-3 text-2xl font-black text-[#C97B6C]">
              {formatPeso(product.price)}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-black ${getStockClass(
                  product.quantity
                )}`}
              >
                {stockLabel}
              </span>

              <span className="rounded-full bg-[#F5F3F1] px-4 py-2 text-xs font-black text-slate-600">
                Stock: {Number(product.quantity || 0)}
              </span>
            </div>

            <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
              {product.description ||
                "Product details are available by contacting staff."}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <ProductInfo label="Category" value={formatCategory(product.category)} />
              <ProductInfo label="Status" value={stockLabel} />
              <ProductInfo label="Price" value={formatPeso(product.price)} />
              <ProductInfo label="Quantity" value={Number(product.quantity || 0)} />
            </div>

            <div className="mt-7 rounded-3xl bg-[#0B1F33] p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E8A093]">
                Note
              </p>

              <p className="mt-2 text-sm font-semibold leading-7 text-white/75">
                Product availability and final price should be confirmed with
                InCredoBall Sports staff. This page is for viewing only and does
                not include checkout.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C97B6C] px-6 py-3 text-sm font-black text-white transition hover:bg-[#B86658]"
              >
                Ask Availability
                <ArrowRight size={17} />
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#DED8D2] bg-white px-6 py-3 text-sm font-black text-[#0B1F33] transition hover:bg-[#FFF8F6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductInfo({ label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#DED8D2] bg-[#F5F3F1] p-4">
      <BadgeCheck size={18} className="shrink-0 text-green-600" />

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>

        <p className="text-sm font-bold text-[#0B1F33]">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div className="rounded-2xl bg-[#F5F3F1] p-4 text-center">
      <p className="text-2xl font-black text-[#C97B6C]">{value}</p>

      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function InfoTile({ icon: Icon, title, text }) {
  return (
    <div className="group rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:text-[#0B1F33]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C97B6C] text-white">
        <Icon size={22} />
      </div>

      <h3 className="mt-5 text-xl font-black">{title}</h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-white/65 group-hover:text-slate-600">
        {text}
      </p>
    </div>
  );
}