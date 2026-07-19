"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Meeting = { id: string; scheduledAt: string; status: string; notes: string | null; organizer: { firstName: string; lastName: string } };

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-3">Review Meetings</h2>
      <div className="space-y-2 mb-4">
        {meetings.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
            <div>
              <p className="font-medium text-gray-900">{new Date(m.scheduledAt).toLocaleString()}</p>
              <p className="text-xs text-gray-400">with {m.organizer.firstName} {m.organizer.lastName}</p>
            </div>
            {canManage && m.status === "SCHEDULED" ? (
              <div className="flex gap-1">
                <button onClick={() => setStatus(m.id, "COMPLETED")} className="text-green-600 hover:underline text-xs">Complete</button>
                <button onClick={() => setStatus(m.id, "CANCELLED")} className="text-red-600 hover:underline text-xs">Cancel</button>
              </div>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[m.status]}`}>{m.status}</span>
            )}
          </div>
        ))}
        {meetings.length === 0 && <p className="text-gray-400 text-sm">No meetings scheduled.</p>}
      </div>

      {canManage && (
        <form onSubmit={schedule} className="flex items-end gap-2 text-sm border-t border-gray-100 pt-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-1">Schedule a review meeting</label>
            <input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <button type="submit" disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60">
            Schedule
          </button>
        </form>
      )}
    </div>
  );
}
