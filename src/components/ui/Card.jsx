export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 md:p-7 ${className}`}
    >
      {children}
    </div>
  );
}