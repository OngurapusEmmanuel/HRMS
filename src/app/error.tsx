"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-100 text-danger-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-1 text-sm text-secondary">
          An unexpected error occurred. {error.digest && <span className="text-muted">(ref: {error.digest})</span>}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
