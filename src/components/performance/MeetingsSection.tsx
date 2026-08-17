"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { meetingStatusVariant } from "@/lib/badge-variants";

type Meeting = { id: string; scheduledAt: string; status: string; notes: string | null; organizer: { firstName: string; lastName: string } };

export default function MeetingsSection({
  employeeId,
  initialMeetings,
  canManage,
}: {
  employeeId: string;
  initialMeetings: Meeting[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/employees/${employeeId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });
    setLoading(false);
    if (res.ok) {
      const created = await res.json();
      setMeetings((prev) => [{ ...created, organizer: { firstName: "You", lastName: "" } }, ...prev]);
      setScheduledAt("");
      router.refresh();
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          {meetings.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-b-0 last:pb-0">
              <div>
                <p className="font-medium text-foreground">{new Date(m.scheduledAt).toLocaleString()}</p>
                <p className="text-xs text-muted">
                  with {m.organizer.firstName} {m.organizer.lastName}
                </p>
              </div>
              {canManage && m.status === "SCHEDULED" ? (
                <div className="flex gap-3">
                  <button onClick={() => setStatus(m.id, "COMPLETED")} className="text-xs text-success-700 hover:underline">
                    Complete
                  </button>
                  <button onClick={() => setStatus(m.id, "CANCELLED")} className="text-xs text-danger-500 hover:underline">
                    Cancel
                  </button>
                </div>
              ) : (
                <Badge variant={meetingStatusVariant[m.status] ?? "neutral"}>{m.status}</Badge>
              )}
            </div>
          ))}
          {meetings.length === 0 && <p className="text-sm text-muted">No meetings scheduled.</p>}
        </div>

        {canManage && (
          <form onSubmit={schedule} className="flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1">
              <Label>Schedule a review meeting</Label>
              <Input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <Button type="submit" loading={loading}>
              Schedule
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
