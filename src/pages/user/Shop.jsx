import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { supabase } from "../../services/supabaseClient";

const PRODUCT_FALLBACK =
  "https://via.placeholder.com/400x400?text=No+Image";

function getImage(url) {
  if (!url) return PRODUCT_FALLBACK;
  return url;
}

function getProductImages(product) {
  const images = [
    ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
    product?.image_url,
  ].filter(Boolean);

  return [...new Set(images)].length
    ? [...new Set(images)]
    : [PRODUCT_FALLBACK];
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    fetchProducts();

    // 🔥 REALTIME SUBSCRIPTION
    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
  }

  function openProduct(product) {
    const images = getProductImages(product);

    setSelectedProduct(product);
    setSelectedImage(getImage(images[0]));
    setSelectedSize("");
  }

  function closeModal() {
    setSelectedProduct(null);
    setSelectedImage(null);
    setSelectedSize("");
  }

  return (
    <div className="page-shell">
      <Sidebar role="user" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Shop" />

          {/* PRODUCT GRID */}
          <div className="grid grid-cols-3 gap-4">
            {products.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow cursor-pointer hover:scale-105 transition"
                onClick={() => openProduct(item)}
              >
                <img
                  src={getImage(
                    item.image_urls?.[0] || item.image_url
                  )}
                  className="h-40 w-full object-cover rounded-lg mb-3"
                />

                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                <p className="font-semibold mt-2">₱{item.price}</p>

                <p className="text-xs mt-1">
                  {item.status === "in_stock"
                    ? "In Stock"
                    : item.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MODAL */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-[90%] max-w-5xl rounded-2xl p-6 flex gap-6">
              {/* LEFT */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  {getProductImages(selectedProduct).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(getImage(img))}
                      className={`h-16 w-16 rounded-lg overflow-hidden border ${
                        selectedImage === getImage(img)
                          ? "border-black"
                          : "border-gray-200"
                      }`}
                    >
                      <img
                        src={getImage(img)}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <div className="w-[400px] h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
                  <img
                    src={selectedImage}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {selectedProduct.name}
                </h2>
                <p className="text-gray-500 mb-2">
                  {selectedProduct.category}
                </p>

                <p className="text-xl font-semibold mb-3">
                  ₱{selectedProduct.price}
                </p>

                <p className="mb-4">{selectedProduct.description}</p>

                {/* SIZE */}
                <div className="mb-4">
                  <p className="font-semibold mb-2">Select Size</p>

                  <div className="grid grid-cols-3 gap-2">
                    {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`border rounded-lg p-2 ${
                          selectedSize === size
                            ? "bg-black text-white"
                            : ""
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!selectedSize}
                  className={`w-full p-3 rounded-xl ${
                    selectedSize
                      ? "bg-black text-white"
                      : "bg-gray-300"
                  }`}
                >
                  {selectedSize ? "Add to Cart" : "Select Size First"}
                </button>

                {/* INFO */}
                <div className="mt-6 text-sm">
                  <p>
                    Stock: <b>{selectedProduct.quantity}</b>
                  </p>
                  <p>
                    Status:{" "}
                    <b>
                      {selectedProduct.status === "in_stock"
                        ? "In Stock"
                        : selectedProduct.status}
                    </b>
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="mt-4 w-full border p-3 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}