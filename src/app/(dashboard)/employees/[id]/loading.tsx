import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl">
      <Skeleton className="mb-1 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-40" />
      <Skeleton className="mb-4 h-9 w-72 rounded-lg" />
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
