import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
