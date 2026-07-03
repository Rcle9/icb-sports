export default function Card({ children, className = "" }) {
  return (
    <div
      className={`slide-up rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}