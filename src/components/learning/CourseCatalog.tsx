"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationHours: string;
  required: boolean;
  enrolled: boolean;
  enrollmentStatus: string | null;
};

const CATEGORY_STYLES: Record<string, string> = {
  COMPLIANCE: "bg-red-100 text-red-700",
  SKILLS: "bg-blue-100 text-blue-700",
  CAREER: "bg-purple-100 text-purple-700",
};

export default function CourseCatalog({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function enroll(courseId: string) {
    setLoadingId(courseId);
    const res = await fetch(`/api/training-courses/${courseId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setLoadingId(null);
    if (res.ok) {
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, enrolled: true, enrollmentStatus: "NOT_STARTED" } : c)));
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[c.category]}`}>{c.category}</span>
            {c.required && <span className="text-xs text-red-500 font-medium">Required</span>}
          </div>
          <p className="font-medium text-gray-900">{c.title}</p>
          {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
          <p className="text-xs text-gray-400 mt-2">{c.durationHours}h</p>

          {c.enrolled ? (
            <span className="mt-3 inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              {c.enrollmentStatus?.replace("_", " ")}
            </span>
          ) : (
            <button
              onClick={() => enroll(c.id)}
              disabled={loadingId === c.id}
              className="mt-3 text-brand-600 hover:underline text-sm font-medium disabled:opacity-50"
            >
              {loadingId === c.id ? "Enrolling..." : "Enroll"}
            </button>
          )}
        </div>
      ))}
      {courses.length === 0 && <p className="text-gray-400 text-sm">No courses available yet.</p>}
    </div>
  );
}
