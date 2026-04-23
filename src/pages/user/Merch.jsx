import Sidebar from "../../components/layout/Sidebar";

export default function Merch() {
  return (
    <div className="flex min-h-screen bg-[#f5f6f8]">
      <Sidebar role="user" />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-[#0f172a] mb-2">Merchandise</h1>
          <p className="text-gray-500 mb-8">
            Shop official sports gear and accessories.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-2">ICB Jersey</h2>
              <p className="text-sm text-gray-500 mb-4">Breathable game-ready top.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                View Item
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-2">Training Shorts</h2>
              <p className="text-sm text-gray-500 mb-4">Flexible fit for daily sessions.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                View Item
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-2">Grip Wrist Wraps</h2>
              <p className="text-sm text-gray-500 mb-4">Support and stability for workouts.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                View Item
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}