"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ratingVariant } from "@/lib/badge-variants";

type Appraisal = {
  id: string;
  periodStart: string;
  periodEnd: string;
  overallRating: string;
  scores: Record<string, number>;
  strengths: string | null;
  areasForImprovement: string | null;
  goals: string | null;
  comments: string | null;
  reviewer: { firstName: string; lastName: string };
};

export default function AppraisalsList({ appraisals }: { appraisals: Appraisal[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (appraisals.length === 0) {
    return <p className="text-sm text-muted">No appraisals on file yet.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {appraisals.map((a) => {
        const rating = Number(a.overallRating);
        const isOpen = expanded === a.id;
        return (
          <div key={a.id} className="py-3">
            <button
              onClick={() => setExpanded(isOpen ? null : a.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(a.periodStart).toLocaleDateString()} – {new Date(a.periodEnd).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted">
                  Reviewed by {a.reviewer.firstName} {a.reviewer.lastName}
                </p>
              </div>
              <Badge variant={ratingVariant(rating)}>{rating.toFixed(2)} / 5</Badge>
            </button>

            {isOpen && (
              <div className="mt-3 space-y-2 rounded-lg bg-surface-2 p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(a.scores).map(([criterion, score]) => (
                    <div key={criterion} className="flex justify-between text-xs">
                      <span className="text-secondary">{criterion}</span>
                      <span className="font-medium text-foreground">{score}/5</span>
                    </div>
                  ))}
                </div>
                {a.strengths && (
                  <p><span className="font-medium text-foreground">Strengths: </span><span className="text-secondary">{a.strengths}</span></p>
                )}
                {a.areasForImprovement && (
                  <p><span className="font-medium text-foreground">Areas for improvement: </span><span className="text-secondary">{a.areasForImprovement}</span></p>
                )}
                {a.goals && (
                  <p><span className="font-medium text-foreground">Goals: </span><span className="text-secondary">{a.goals}</span></p>
                )}
                {a.comments && (
                  <p><span className="font-medium text-foreground">Comments: </span><span className="text-secondary">{a.comments}</span></p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
