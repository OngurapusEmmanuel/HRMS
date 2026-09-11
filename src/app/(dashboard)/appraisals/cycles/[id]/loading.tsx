import { Skeleton, CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-4 w-40" />
      <Skeleton className="mb-1 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton cols={3} rows={6} />
      </div>
    </div>
  );
}
