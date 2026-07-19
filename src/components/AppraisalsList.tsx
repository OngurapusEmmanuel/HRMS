"use client";

import { useState } from "react";

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

function ratingColor(rating: number) {
  if (rating >= 4) return "bg-green-100 text-green-700";
  if (rating >= 3) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function AppraisalsList({ appraisals }: { appraisals: Appraisal[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (appraisals.length === 0) {
    return <p className="text-gray-400 text-sm">No appraisals on file yet.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {appraisals.map((a) => {
        const rating = Number(a.overallRating);
        const isOpen = expanded === a.id;
        return (
          <div key={a.id} className="py-3">
            <button
              onClick={() => setExpanded(isOpen ? null : a.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(a.periodStart).toLocaleDateString()} – {new Date(a.periodEnd).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  Reviewed by {a.reviewer.firstName} {a.reviewer.lastName}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ratingColor(rating)}`}>
                {rating.toFixed(2)} / 5
              </span>
            </button>

            {isOpen && (
              <div className="mt-3 space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(a.scores).map(([criterion, score]) => (
                    <div key={criterion} className="flex justify-between text-xs">
                      <span className="text-gray-500">{criterion}</span>
                      <span className="font-medium text-gray-700">{score}/5</span>
                    </div>
                  ))}
                </div>
                {a.strengths && (
                  <p><span className="font-medium text-gray-700">Strengths: </span><span className="text-gray-600">{a.strengths}</span></p>
                )}
                {a.areasForImprovement && (
                  <p><span className="font-medium text-gray-700">Areas for improvement: </span><span className="text-gray-600">{a.areasForImprovement}</span></p>
                )}
                {a.goals && (
                  <p><span className="font-medium text-gray-700">Goals: </span><span className="text-gray-600">{a.goals}</span></p>
                )}
                {a.comments && (
                  <p><span className="font-medium text-gray-700">Comments: </span><span className="text-gray-600">{a.comments}</span></p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
