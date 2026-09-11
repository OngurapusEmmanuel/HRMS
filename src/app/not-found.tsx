import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <FileQuestion className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-1 text-sm text-secondary">The page you're looking for doesn't exist or may have moved.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
