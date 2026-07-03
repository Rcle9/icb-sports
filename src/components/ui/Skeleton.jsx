export default function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-5 h-10 w-full" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="rounded-3xl border border-slate-200 bg-white p-4"
        >
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-3 h-4 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}