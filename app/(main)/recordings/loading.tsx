import { Skeleton } from "@/components/ui/Page";

export default function RecordingsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="mt-2 h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-0 overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="mb-2 h-4 w-40 rounded-md" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
