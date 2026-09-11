import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
}) {
  const content = (
    <CardContent className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm text-secondary">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
          <Icon className="h-4 w-4" />
        </span>
      )}
    </CardContent>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Card className={cn("transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:hover:border-primary-800")}>
          {content}
        </Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}
