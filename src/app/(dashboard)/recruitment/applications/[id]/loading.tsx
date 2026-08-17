import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-4 w-64" />
      <Skeleton className="mb-1 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
