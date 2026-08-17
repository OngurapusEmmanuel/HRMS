import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-7 w-32" />
      <Skeleton className="mb-6 h-4 w-56" />
      <TableSkeleton cols={5} rows={10} />
    </div>
  );
}
