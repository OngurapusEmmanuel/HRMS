import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="mb-1 h-7 w-28" />
      <Skeleton className="mb-6 h-4 w-72" />
      <Skeleton className="mb-4 h-9 w-96 rounded-lg" />
      <CardSkeleton />
    </div>
  );
}
