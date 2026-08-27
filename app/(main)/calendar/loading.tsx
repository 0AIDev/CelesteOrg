import { Skeleton } from "@/components/ui/Page";

export default function CalendarLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="mt-2 h-4 w-44 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <Skeleton key={d} className="h-4 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
