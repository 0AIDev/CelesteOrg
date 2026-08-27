import { Skeleton } from "@/components/ui/Page";

export default function AiUsageLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="mt-2 h-4 w-52 rounded-md" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-3 h-4 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <div className="card p-5 mb-6">
        <Skeleton className="mb-4 h-4 w-36 rounded-md" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="flex-1 h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
