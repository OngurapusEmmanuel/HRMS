"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { complianceStatusVariant } from "@/lib/badge-variants";

type Requirement = {
  id: string;
  title: string;
  jurisdiction: string | null;
  frequency: string;
  nextDueDate: string;
  currentRecord: { id: string; status: string; dueDate: string } | null;
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
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requirement</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.title}</TableCell>
              <TableCell className="text-secondary">{r.jurisdiction ?? "—"}</TableCell>
              <TableCell className="text-secondary">{r.frequency.replace("_", "-").toLowerCase()}</TableCell>
              <TableCell className="text-secondary">{r.currentRecord ? new Date(r.currentRecord.dueDate).toLocaleDateString() : "—"}</TableCell>
              <TableCell>
                {r.currentRecord && (
                  <Badge variant={complianceStatusVariant[r.currentRecord.status] ?? "neutral"}>{r.currentRecord.status}</Badge>
                )}
              </TableCell>
              <TableCell>
                {r.currentRecord && r.currentRecord.status !== "COMPLETE" && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => markComplete(r.currentRecord!.id, r.id)}
                    loading={loadingId === r.currentRecord.id}
                  >
                    {loadingId === r.currentRecord.id ? "Saving..." : "Mark Complete"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {requirements.length === 0 && (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="No compliance requirements tracked yet"
          description="Add a requirement to start tracking statutory deadlines."
        />
      )}
    </TableContainer>
  );
}
