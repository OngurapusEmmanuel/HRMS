"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
};

export default function OnboardingChecklist({
  employeeId,
  initialTasks,
}: {
  employeeId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, setPending] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  async function toggle(task: Task) {
    setPending(task.id);
    const res = await fetch(`/api/employees/${employeeId}/onboarding/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    setPending(null);
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    }
  }

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Checklist</CardTitle>
        <span className="text-sm text-secondary">
          {completedCount}/{tasks.length} done
        </span>
      </CardHeader>
      <CardContent>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="space-y-1">
          {tasks.map((t) => (
            <label
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-2 cursor-pointer transition-colors hover:bg-surface-2",
                pending === t.id && "opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={t.completed}
                disabled={pending !== null}
                onChange={() => toggle(t)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong text-primary-500 focus:ring-primary-500"
              />
              <div>
                <p className={cn("text-sm font-medium", t.completed ? "text-muted line-through" : "text-foreground")}>
                  {t.title}
                </p>
                {t.description && <p className="text-xs text-muted">{t.description}</p>}
              </div>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
