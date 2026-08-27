import { Skeleton } from "@/components/ui/Page";

export default function CrmLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="mt-2 h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
