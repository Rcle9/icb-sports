import { Link } from "react-router-dom";
import LandingLayout from "./LandingLayout";

const facilities = [
  {
    name: "Basketball Court",
    desc: "Indoor court for training, events, and friendly games.",
    img: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Pickleball",
    desc: "Court space for casual and competitive pickleball sessions.",
    img: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Table Tennis",
    desc: "Indoor table tennis area for practice and fast-paced matches.",
    img: "https://images.unsplash.com/photo-1611251135345-18c56206b863?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function Facilities() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-[#C97B6C]">
              Facilities
            </p>
            <h2 className="mt-3 text-4xl font-black">All-In Access. All-Out Action.</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Choose from available InCredoBall sports facilities and book your schedule online.
            </p>
          </div>

          <Link to="/register" className="rounded-2xl bg-[#C97B6C] px-6 py-3 font-black text-white hover:bg-[#B87463]">
            Book Facility
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {facilities.map((facility) => (
            <div key={facility.name} className="overflow-hidden rounded-[32px] border border-[#DED8D2] bg-white shadow-sm">
              <img src={facility.img} alt={facility.name} className="h-64 w-full object-cover" />

              <div className="p-6">
                <h3 className="text-2xl font-black">{facility.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{facility.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </LandingLayout>
  );
}