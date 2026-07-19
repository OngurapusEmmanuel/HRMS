"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  periodStart: string;
  periodEnd: string;
  totalAppraisals: number;
  averageRating: string | null;
  ratingTrend: string | null;
  strengthsSummary: string | null;
  improvementAreas: string | null;
  recommendation: string | null;
  generatedAt: string;
} | null;

const RECOMMENDATION_STYLES: Record<string, string> = {
  RENEW: "bg-green-100 text-green-700",
  PROMOTE: "bg-blue-100 text-blue-700",
  EXTEND_PROBATION: "bg-yellow-100 text-yellow-700",
  DO_NOT_RENEW: "bg-red-100 text-red-700",
};

export default function ContractSummaryCard({
  employeeId,
  initialSummary,
  canRegenerate,
}: {
  employeeId: string;
  initialSummary: Summary;
  canRegenerate: boolean;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/employees/${employeeId}/contract-summary`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate summary");
      return;
    }
    const data = await res.json();
    setSummary(data);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900">Contract Summary</h2>
        {canRegenerate && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-brand-600 hover:underline text-xs font-medium disabled:opacity-50"
          >
            {loading ? "Generating..." : summary ? "Regenerate" : "Generate now"}
          </button>
        )}
      </div>

      {!summary && (
        <p className="text-sm text-gray-400">
          {canRegenerate
            ? "Not generated yet — this happens automatically on termination, or generate it manually for a fixed-term contract nearing its end."
            : "Not generated yet."}
        </p>
      )}

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {summary && (
        <div className="space-y-3 text-sm mt-3">
          <div className="flex items-center gap-3">
            {summary.recommendation && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RECOMMENDATION_STYLES[summary.recommendation] ?? "bg-gray-100 text-gray-600"}`}>
                {summary.recommendation.replace(/_/g, " ")}
              </span>
            )}
            {summary.averageRating && (
              <span className="text-gray-700 font-medium">{Number(summary.averageRating).toFixed(2)} / 5 average</span>
            )}
            {summary.ratingTrend && <span className="text-gray-400 text-xs">{summary.ratingTrend}</span>}
          </div>

          <p className="text-gray-500 text-xs">
            {new Date(summary.periodStart).toLocaleDateString()} – {new Date(summary.periodEnd).toLocaleDateString()} ·{" "}
            {summary.totalAppraisals} appraisal{summary.totalAppraisals === 1 ? "" : "s"} on file
          </p>

          {summary.strengthsSummary && (
            <p><span className="font-medium text-gray-700">Strengths: </span><span className="text-gray-600">{summary.strengthsSummary}</span></p>
          )}
          {summary.improvementAreas && (
            <p><span className="font-medium text-gray-700">Areas for improvement: </span><span className="text-gray-600">{summary.improvementAreas}</span></p>
          )}

          <p className="text-xs text-gray-400">Generated {new Date(summary.generatedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
