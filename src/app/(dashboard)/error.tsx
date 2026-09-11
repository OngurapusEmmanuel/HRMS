"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Scoped to (dashboard) — the Sidebar/Topbar in that segment's layout.tsx
// stay mounted and visible around this fallback, so a page-level error
// doesn't take out the whole app shell.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-100 text-danger-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium text-foreground">This page hit an error</p>
            <p className="mt-1 text-sm text-secondary">
              Try again, or head back to the dashboard if it keeps happening.
              {error.digest && <span className="mt-1 block text-xs text-muted">Ref: {error.digest}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/dashboard")}>
              Dashboard
            </Button>
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
