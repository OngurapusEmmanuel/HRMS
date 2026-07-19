"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Requirement = {
  id: string;
  title: string;
  jurisdiction: string | null;
  frequency: string;
  nextDueDate: string;
  currentRecord: { id: string; status: string; dueDate: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  COMPLETE: "bg-green-100 text-green-700",
};

export default function ComplianceList({ initialRequirements }: { initialRequirements: Requirement[] }) {
  const router = useRouter();
  const [requirements, setRequirements] = useState(initialRequirements);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function markComplete(recordId: string, requirementId: string) {
    setLoadingId(recordId);
    const res = await fetch(`/api/compliance-records/${recordId}/complete`, { method: "POST" });
    setLoadingId(null);
    if (res.ok) {
      router.refresh();
      setRequirements((prev) =>
        prev.map((r) => (r.id === requirementId ? { ...r, currentRecord: r.currentRecord ? { ...r.currentRecord, status: "COMPLETE" } : null } : r))
      );
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Requirement</th>
            <th className="px-4 py-3 font-medium">Jurisdiction</th>
            <th className="px-4 py-3 font-medium">Frequency</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requirements.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
              <td className="px-4 py-3 text-gray-500">{r.jurisdiction ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500">{r.frequency.replace("_", "-").toLowerCase()}</td>
              <td className="px-4 py-3 text-gray-500">{r.currentRecord ? new Date(r.currentRecord.dueDate).toLocaleDateString() : "—"}</td>
              <td className="px-4 py-3">
                {r.currentRecord && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.currentRecord.status]}`}>
                    {r.currentRecord.status}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {r.currentRecord && r.currentRecord.status !== "COMPLETE" && (
                  <button
                    onClick={() => markComplete(r.currentRecord!.id, r.id)}
                    disabled={loadingId === r.currentRecord.id}
                    className="text-brand-600 hover:underline text-xs font-medium disabled:opacity-50"
                  >
                    {loadingId === r.currentRecord.id ? "Saving..." : "Mark Complete"}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {requirements.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No compliance requirements tracked yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
