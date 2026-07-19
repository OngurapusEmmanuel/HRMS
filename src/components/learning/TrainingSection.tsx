"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Enrollment = {
  id: string;
  status: string;
  dueDate: string | null;
  course: { title: string; category: string };
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default function TrainingSection({ enrollments: initial, canUpdate }: { enrollments: Enrollment[]; canUpdate: boolean }) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState(initial);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setEnrollments((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      router.refresh();
    }
  }

  if (enrollments.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-3">Training</h2>
      <div className="divide-y divide-gray-100">
        {enrollments.map((e) => (
          <div key={e.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-900">{e.course.title}</p>
              {e.dueDate && <p className="text-xs text-gray-400">Due {new Date(e.dueDate).toLocaleDateString()}</p>}
            </div>
            {canUpdate && e.status !== "COMPLETED" ? (
              <div className="flex gap-1">
                {["IN_PROGRESS", "COMPLETED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(e.id, s)}
                    className="px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    Mark {s.replace("_", " ").toLowerCase()}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status]}`}>{e.status.replace("_", " ")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
