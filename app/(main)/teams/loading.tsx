import { Skeleton } from "@/components/ui/Page";

export default function TeamsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-2 h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="mb-4 h-3 w-full rounded-md" />
            <div className="flex -space-x-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-7 w-7 rounded-full ring-2 ring-white" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
