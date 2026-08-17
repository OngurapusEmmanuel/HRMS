"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { feedbackSubmittedVariant } from "@/lib/badge-variants";

type Task = { id: string; employeeName: string; relationship: string; submitted: boolean };

export default function FeedbackTaskList({ requests }: { requests: Task[] }) {
  const [tasks, setTasks] = useState(requests);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ strengths: "", areasForImprovement: "", comments: "" });
  const [loading, setLoading] = useState(false);

  async function submit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/feedback-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, submitted: true } : t)));
      setOpenId(null);
      setForm({ strengths: "", areasForImprovement: "", comments: "" });
    }
  }

  const pending = tasks.filter((t) => !t.submitted);
  const done = tasks.filter((t) => t.submitted);

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-border">
        {pending.map((t) => (
          <div key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t.employeeName}</p>
                <p className="text-xs text-muted">as {t.relationship.replace("_", " ").toLowerCase()}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                {openId === t.id ? "Cancel" : "Give feedback"}
              </Button>
            </div>
            {openId === t.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Strengths"
                  rows={2}
                  value={form.strengths}
                  onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
                />
                <Textarea
                  placeholder="Areas for improvement"
                  rows={2}
                  value={form.areasForImprovement}
                  onChange={(e) => setForm((f) => ({ ...f, areasForImprovement: e.target.value }))}
                />
                <Textarea
                  placeholder="Other comments (optional)"
                  rows={2}
                  value={form.comments}
                  onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                />
                <Button onClick={() => submit(t.id)} loading={loading}>
                  {loading ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            )}
          </div>
        ))}
        {pending.length === 0 && (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No pending feedback requests." />
        )}
      </Card>

      {done.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-secondary">Already submitted</h2>
          <Card className="divide-y divide-border">
            {done.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-foreground">
                  {t.employeeName} · {t.relationship.replace("_", " ").toLowerCase()}
                </span>
                <Badge variant={feedbackSubmittedVariant(true)}>Submitted</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
