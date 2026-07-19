"use client";

import { useState } from "react";

type Status = {
  email: { provider: string; configured: boolean };
  storage: { provider: string; configured: boolean };
};

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {label}
    </span>
  );
}

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Integrations</h2>
      <p className="text-sm text-gray-500 mb-4">
        Provider selection and credentials live in environment variables, not here — this just shows current status.
      </p>

      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Email — {status.email.provider}</p>
            <p className="text-xs text-gray-400">
              {status.email.provider === "console"
                ? "Emails are logged to the server console, not sent. Set EMAIL_PROVIDER to enable a real provider."
                : status.email.configured
                ? "Credentials detected."
                : "Provider selected but credentials are missing — emails will fail silently and fall back to console logging."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge ok={status.email.configured} label={status.email.configured ? "Configured" : "Incomplete"} />
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="text-brand-600 hover:underline text-xs font-medium disabled:opacity-50"
            >
              {testing ? "Sending..." : "Send test"}
            </button>
          </div>
        </div>
        {testResult === "success" && (
          <p className="text-green-600 text-xs">
            Test email sent (or logged to the console, if using the console provider). Check your inbox or server logs.
          </p>
        )}
        {testResult === "error" && <p className="text-red-600 text-xs">Failed to send — check server logs for details.</p>}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="font-medium text-gray-900">File storage — {status.storage.provider}</p>
            <p className="text-xs text-gray-400">
              {status.storage.provider === "local"
                ? "Local disk. Fine for a persistent server, not for serverless deploys — set STORAGE_PROVIDER=s3 for production."
                : status.storage.configured
                ? "S3-compatible credentials detected."
                : "S3 selected but bucket/credentials are missing — uploads will fail."}
            </p>
          </div>
          <Badge ok={status.storage.configured} label={status.storage.configured ? "Configured" : "Incomplete"} />
        </div>
      </div>
    </div>
  );
}
