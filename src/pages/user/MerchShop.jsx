import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Card from "../../components/ui/Card";
import { getInventory } from "../../services/inventoryService";

export default function MerchShop() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getInventory();
    setProducts(data || []);
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] md:flex">
      <Sidebar role="user" />

      <main className="flex-1 p-6">
        <Topbar title="Merchandise Shop" />

        {/* HERO */}
        <div className="mb-6 rounded-3xl bg-black text-white p-8">
          <h2 className="text-3xl font-bold">InCredoBall Store</h2>
          <p className="text-gray-300 mt-2">
            Premium sports apparel & gear
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className="cursor-pointer group"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
                
                {/* IMAGE */}
                <div className="h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.image_url || "/placeholder.png"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>

                {/* INFO */}
                <div className="p-4">
                  <p className="font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    ₱ {item.price}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* PRODUCT MODAL */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 relative">
              
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-gray-500"
              >
                ✕
              </button>

              <div className="grid md:grid-cols-2 gap-6">
                
                <img
                  src={selected.image_url || "/placeholder.png"}
                  className="w-full h-80 object-cover rounded-2xl"
                />

                <div>
                  <h2 className="text-2xl font-bold">
                    {selected.name}
                  </h2>

                  <p className="mt-2 text-gray-500">
                    {selected.description || "No description"}
                  </p>

                  <p className="mt-4 text-xl font-bold">
                    ₱ {selected.price}
                  </p>

                  <button className="mt-6 w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800">
                    Add to Cart (next step)
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}