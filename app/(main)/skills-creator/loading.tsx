import { Skeleton } from "@/components/ui/Page";

export default function SkillsCreatorLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="mt-2 h-4 w-52 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <Skeleton className="mb-4 h-4 w-24 rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="mb-1.5 h-3.5 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="card p-5">
          <Skeleton className="mb-4 h-4 w-20 rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <Skeleton className="flex-1 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
