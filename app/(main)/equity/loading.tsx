import { Skeleton } from "@/components/ui/Page";

export default function EquityLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="mt-2 h-4 w-48 rounded-md" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-2 h-4 w-24 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <Skeleton className="mb-4 h-4 w-28 rounded-md" />
        <Skeleton className="h-3 w-full rounded-full mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
      <div className="mt-6 card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="flex-1 h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
