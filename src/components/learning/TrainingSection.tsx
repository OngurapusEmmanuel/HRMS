"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trainingStatusVariant } from "@/lib/badge-variants";

type Enrollment = {
  id: string;
  status: string;
  dueDate: string | null;
  course: { title: string; category: string };
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
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {enrollments.map((e) => {
          const isOverdue = e.status === "OVERDUE";
          return (
            <div key={e.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{e.course.title}</p>
                {e.dueDate && (
                  <p className={`flex items-center gap-1 text-xs ${isOverdue ? "text-danger-600 dark:text-danger-500" : "text-muted"}`}>
                    {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                    Due {new Date(e.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              {canUpdate && e.status !== "COMPLETED" ? (
                <div className="flex gap-1">
                  {["IN_PROGRESS", "COMPLETED"].map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => setStatus(e.id, s)}>
                      Mark {s.replace("_", " ").toLowerCase()}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge variant={trainingStatusVariant[e.status] ?? "neutral"}>{e.status.replace("_", " ")}</Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
