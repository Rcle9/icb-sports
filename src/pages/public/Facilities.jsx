import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Trophy } from "lucide-react";
import LandingLayout from "./LandingLayout";
import { supabase } from "../../services/supabaseClient";

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="36" font-weight="700" fill="#64748b">Facility</text>
    </svg>
  `);

function money(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function normalizeFacilityType(value) {
  const type = String(value || "").toLowerCase().trim();

  if (type.includes("pickle")) return "pickleball";
  if (type.includes("basket")) return "basketball";
  if (type.includes("table") || type.includes("tennis")) return "table_tennis";

  return type.replaceAll(" ", "_");
}

function getFacilityImage(facility) {
  if (facility?.image_url) return facility.image_url;

  if (Array.isArray(facility?.image_urls) && facility.image_urls.length > 0) {
    return facility.image_urls[0];
  }

  return FALLBACK;
}

function getFacilityPrice(facility) {
  return Number(
    facility?.price ||
      facility?.rate_per_hour ||
      facility?.price_per_hour ||
      facility?.hourly_rate ||
      0
  );
}

function buildSportGroups(facilities) {
  const sportConfig = [
    {
      key: "pickleball",
      title: "Pickleball",
      label: "Pickleball Courts",
      description:
        "Reserve pickleball courts for recreational games, practice, drills, and competitive matches.",
      fallbackCount: 6,
      unit: "court",
    },
    {
      key: "basketball",
      title: "Basketball",
      label: "Basketball Court",
      description:
        "Book the basketball court for training, team games, and friendly matches.",
      fallbackCount: 1,
      unit: "court",
    },
    {
      key: "table_tennis",
      title: "Table Tennis",
      label: "Table Tennis Tables",
      description:
        "Play, rally, and enjoy table tennis sessions for casual and competitive players.",
      fallbackCount: 2,
      unit: "table",
    },
  ];

  return sportConfig.map((sport) => {
    const items = facilities.filter(
      (facility) => normalizeFacilityType(facility.type) === sport.key
    );

    const firstFacility = items[0];
    const minPrice = items.length
      ? Math.min(...items.map((facility) => getFacilityPrice(facility)))
      : 0;

    const count = items.length || sport.fallbackCount;

    return {
      ...sport,
      count,
      items,
      image: getFacilityImage(firstFacility),
      price: minPrice,
    };
  });
}

export default function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sportGroups = useMemo(() => {
    return buildSportGroups(facilities);
  }, [facilities]);

  useEffect(() => {
    loadFacilities();

    const channel = supabase
      .channel("public-facility-sports")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
        },
        () => loadFacilities(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadFacilities(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const { data, error: facilityError } = await supabase
        .from("facilities")
        .select("*")
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (facilityError) throw facilityError;

      const activeFacilities = (data || []).filter((facility) => {
        if (facility.is_active === undefined || facility.is_active === null) {
          return true;
        }

        return facility.is_active;
      });

      setFacilities(activeFacilities);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Facilities
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#2B2B2B] md:text-5xl">
              Play, train, and enjoy at Incredoball Sports.
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Explore the main sport facilities available at Incredoball Sports:
              pickleball, basketball, and table tennis.
            </p>
          </div>

          <Link
            to="/register"
            className="rounded-2xl bg-[#C97B6C] px-7 py-4 font-black text-white shadow-sm transition hover:bg-[#B87463]"
          >
            Book Facility
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[32px] border border-[#DED8D2] bg-white p-10 text-center font-bold text-slate-500">
            Loading facilities...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {sportGroups.map((sport) => (
              <div
                key={sport.key}
                className="group overflow-hidden rounded-[32px] border border-[#DED8D2] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-72 overflow-hidden bg-slate-100">
                  <img
                    src={sport.image}
                    alt={sport.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK;
                    }}
                  />

                  <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#C97B6C] shadow-sm">
                    {sport.count} {sport.unit}
                    {sport.count > 1 ? "s" : ""}
                  </span>

                  {sport.price > 0 && (
                    <span className="absolute bottom-5 left-5 rounded-2xl bg-black/75 px-4 py-3 text-white shadow-sm">
                      <span className="block text-xl font-black">
                        Starts at {money(sport.price)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Per Hour
                      </span>
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black text-[#2B2B2B]">
                    {sport.label}
                  </h3>

                  <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-500">
                    <MapPin size={16} className="mt-1 shrink-0 text-[#C97B6C]" />
                    <span>E.J. Blanco Extension, Daro, Dumaguete City</span>
                  </div>

                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">
                    {sport.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-[#F3E4DF] px-4 py-2 text-xs font-black text-[#C97B6C]">
                      <Trophy size={14} />
                      Available
                    </div>

                    <Link
                      to="/register"
                      className="rounded-2xl bg-[#2B2B2B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#C97B6C]"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </LandingLayout>
  );
}