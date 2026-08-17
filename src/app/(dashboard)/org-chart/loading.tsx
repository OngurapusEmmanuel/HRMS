import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-1 h-7 w-32" />
      <Skeleton className="mb-6 h-4 w-56" />
      <div className="space-y-3">
        <Skeleton className="h-14 w-80 rounded-lg" />
        <div className="ml-6 space-y-3 border-l border-border pl-6">
          <Skeleton className="h-14 w-80 rounded-lg" />
          <Skeleton className="h-14 w-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
