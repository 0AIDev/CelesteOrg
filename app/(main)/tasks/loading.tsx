import { Skeleton } from "@/components/ui/Page";

export default function TasksLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-2 h-4 w-44 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {["Todo", "In Progress", "Done"].map((col) => (
          <div key={col} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-100 bg-white p-3">
                  <Skeleton className="mb-2 h-4 w-full rounded-md" />
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
