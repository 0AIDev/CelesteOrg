import { Skeleton } from "@/components/ui/Page";

export default function DevelopersLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="mt-2 h-4 w-52 rounded-md" />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md font-mono" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
