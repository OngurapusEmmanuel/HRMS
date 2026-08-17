"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { contractRecommendationVariant } from "@/lib/badge-variants";

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
    <Card>
      <CardHeader>
        <CardTitle>Contract Summary</CardTitle>
        {canRegenerate && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400"
          >
            {loading ? "Generating..." : summary ? "Regenerate" : "Generate now"}
          </button>
        )}
      </CardHeader>
      <CardContent>
        {!summary && (
          <p className="text-sm text-muted">
            {canRegenerate
              ? "Not generated yet — this happens automatically on termination, or generate it manually for a fixed-term contract nearing its end."
              : "Not generated yet."}
          </p>
        )}

        {error && (
          <div className="mb-2">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {summary && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {summary.recommendation && (
                <Badge variant={contractRecommendationVariant[summary.recommendation] ?? "neutral"}>
                  {summary.recommendation.replace(/_/g, " ")}
                </Badge>
              )}
              {summary.averageRating && (
                <span className="font-medium text-foreground">{Number(summary.averageRating).toFixed(2)} / 5 average</span>
              )}
              {summary.ratingTrend && <span className="text-xs text-muted">{summary.ratingTrend}</span>}
            </div>

            <p className="text-xs text-secondary">
              {new Date(summary.periodStart).toLocaleDateString()} – {new Date(summary.periodEnd).toLocaleDateString()} ·{" "}
              {summary.totalAppraisals} appraisal{summary.totalAppraisals === 1 ? "" : "s"} on file
            </p>

            {summary.strengthsSummary && (
              <p>
                <span className="font-medium text-foreground">Strengths: </span>
                <span className="text-secondary">{summary.strengthsSummary}</span>
              </p>
            )}
            {summary.improvementAreas && (
              <p>
                <span className="font-medium text-foreground">Areas for improvement: </span>
                <span className="text-secondary">{summary.improvementAreas}</span>
              </p>
            )}

            <p className="text-xs text-muted">Generated {new Date(summary.generatedAt).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
