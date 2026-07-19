"use client";

import { useState } from "react";

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900">Onboarding Checklist</h2>
        <span className="text-sm text-gray-500">{completedCount}/{tasks.length} done</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <label
            key={t.id}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${pending === t.id ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={t.completed}
              disabled={pending !== null}
              onChange={() => toggle(t)}
              className="mt-0.5"
            />
            <div>
              <p className={`text-sm font-medium ${t.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                {t.title}
              </p>
              {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
