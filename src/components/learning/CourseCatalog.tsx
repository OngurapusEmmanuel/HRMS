"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BookOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { courseCategoryVariant, trainingStatusVariant } from "@/lib/badge-variants";

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

  if (courses.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No courses available yet"
          description="Training courses will appear here once they're added to the catalog."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c) => (
        <Card key={c.id}>
          <CardContent>
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={courseCategoryVariant[c.category] ?? "neutral"}>{c.category}</Badge>
              {c.required && (
                <span className="flex items-center gap-1 text-xs font-medium text-danger-600 dark:text-danger-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Required
                </span>
              )}
            </div>
            <p className="font-medium text-foreground">{c.title}</p>
            {c.description && <p className="mt-1 text-sm text-secondary line-clamp-2">{c.description}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              {c.durationHours}h
            </p>

            {c.enrolled ? (
              <Badge className="mt-3" variant={c.enrollmentStatus ? trainingStatusVariant[c.enrollmentStatus] ?? "neutral" : "neutral"}>
                {c.enrollmentStatus?.replace("_", " ")}
              </Badge>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="mt-3"
                onClick={() => enroll(c.id)}
                loading={loadingId === c.id}
              >
                {loadingId === c.id ? "Enrolling..." : "Enroll"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
