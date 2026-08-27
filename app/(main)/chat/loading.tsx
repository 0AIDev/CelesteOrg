import { Skeleton } from "@/components/ui/Page";

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="mt-2 h-4 w-44 rounded-md" />
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="w-60 shrink-0 card p-3 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1 rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex-1 card p-4 flex flex-col justify-end gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-56" : "w-44"}`} />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}
