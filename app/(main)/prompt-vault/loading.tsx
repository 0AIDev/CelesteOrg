import { Skeleton } from "@/components/ui/Page";

export default function PromptVaultLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="mt-2 h-4 w-56 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <Skeleton className="mb-2 h-4 w-full rounded-md" />
            <Skeleton className="mb-1 h-3 w-full rounded-md" />
            <Skeleton className="mb-4 h-3 w-3/4 rounded-md" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
