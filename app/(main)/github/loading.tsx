import { Skeleton } from "@/components/ui/Page";

export default function GithubLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="mt-2 h-4 w-52 rounded-md" />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-2 h-4 w-24 rounded-md" />
            <Skeleton className="h-7 w-12 rounded-md" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <Skeleton className="flex-1 h-4 w-48 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
