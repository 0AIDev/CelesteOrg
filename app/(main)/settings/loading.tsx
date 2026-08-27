import { Skeleton } from "@/components/ui/Page";

export default function SettingsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="mt-2 h-4 w-44 rounded-md" />
      </div>
      <div className="mb-6 flex gap-4 border-b border-gray-200 pb-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-t-md" />
        ))}
      </div>
      <div className="card p-6 max-w-xl">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div>
            <Skeleton className="mb-2 h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-4">
            <Skeleton className="mb-1.5 h-3.5 w-24 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="mt-4 h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}
