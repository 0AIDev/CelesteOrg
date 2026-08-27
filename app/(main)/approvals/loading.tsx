import { Skeleton } from "@/components/ui/Page";

export default function ApprovalsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="mt-2 h-4 w-48 rounded-md" />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-2 h-4 w-20 rounded-md" />
            <Skeleton className="h-7 w-10 rounded-md" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-4 w-56 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
