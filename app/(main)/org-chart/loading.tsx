import { Skeleton } from "@/components/ui/Page";

export default function OrgChartLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="mt-2 h-4 w-56 rounded-md" />
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="card p-5 w-52">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 w-44">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 w-36">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
