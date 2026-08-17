"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { providerConnectionVariant } from "@/lib/badge-variants";

type Status = {
  email: { provider: string; configured: boolean };
  storage: { provider: string; configured: boolean };
};

export default function ProvidersCard({ initialStatus }: { initialStatus: Status }) {
  const [status] = useState(initialStatus);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  async function handleTestEmail() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/settings/email-test", { method: "POST" });
    setTesting(false);
    setTestResult(res.ok ? "success" : "error");
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0">
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Provider selection and credentials live in environment variables, not here — this just shows current status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email — {status.email.provider}</p>
              <p className="text-xs text-muted">
                {status.email.provider === "console"
                  ? "Emails are logged to the server console, not sent. Set EMAIL_PROVIDER to enable a real provider."
                  : status.email.configured
                  ? "Credentials detected."
                  : "Provider selected but credentials are missing — emails will fail silently and fall back to console logging."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={providerConnectionVariant(status.email.configured)}>
                {status.email.configured ? "Configured" : "Incomplete"}
              </Badge>
              <Button variant="link" size="sm" onClick={handleTestEmail} disabled={testing} className="text-xs">
                {testing ? "Sending..." : "Send test"}
              </Button>
            </div>
          </div>
          {testResult === "success" && (
            <p className="text-xs text-success-700">
              Test email sent (or logged to the console, if using the console provider). Check your inbox or server logs.
            </p>
          )}
          {testResult === "error" && <p className="text-xs text-danger-500">Failed to send — check server logs for details.</p>}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="font-medium text-foreground">File storage — {status.storage.provider}</p>
              <p className="text-xs text-muted">
                {status.storage.provider === "local"
                  ? "Local disk. Fine for a persistent server, not for serverless deploys — set STORAGE_PROVIDER=s3 for production."
                  : status.storage.configured
                  ? "S3-compatible credentials detected."
                  : "S3 selected but bucket/credentials are missing — uploads will fail."}
              </p>
            </div>
            <Badge variant={providerConnectionVariant(status.storage.configured)}>
              {status.storage.configured ? "Configured" : "Incomplete"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
