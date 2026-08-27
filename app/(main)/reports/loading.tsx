import { Skeleton } from "@/components/ui/Page";

export default function ReportsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="mt-2 h-4 w-44 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
