"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { documentTypeVariant } from "@/lib/badge-variants";
import ConfirmDialog from "@/components/ConfirmDialog";
import { extractErrorMessage } from "@/lib/api-error";

const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "POLICY", label: "Policy" },
  { value: "IDENTITY", label: "Identity" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "OTHER", label: "Other" },
] as const;

type Doc = {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// null = doesn't expire or expiry is comfortably far out; "danger" = already
// past expiresAt; "warning" = expiring within the next 30 days.
function expiryVariant(expiresAt: string | null): { variant: "danger" | "warning"; label: string } | null {
  if (!expiresAt) return null;
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY);
  if (daysLeft < 0) return { variant: "danger", label: "Expired" };
  if (daysLeft <= 30) return { variant: "warning", label: `Expires in ${daysLeft}d` };
  return null;
}

export default function DocumentsSection({
  employeeId,
  initialDocuments,
  canDelete,
}: {
  employeeId: string;
  initialDocuments: Doc[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("OTHER");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", docType);
    if (expiresAt) formData.append("expiresAt", expiresAt);

    const res = await fetch(`/api/employees/${employeeId}/documents`, { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(extractErrorMessage(body, "Upload failed"));
      return;
    }
    const doc = await res.json();
    setDocuments((prev) => [doc, ...prev]);
    setTitle("");
    setDocType("OTHER");
    setExpiresAt("");
    setFile(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/employees/${employeeId}/documents/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(extractErrorMessage(body, "Failed to remove document"));
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 divide-y divide-border">
          {documents.map((d) => {
            const expiry = expiryVariant(d.expiresAt);
            return (
            <div key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted" />
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {d.title}
                    </a>
                    <Badge variant={documentTypeVariant[d.type] ?? "neutral"}>
                      {DOCUMENT_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                    </Badge>
                    {expiry && <Badge variant={expiry.variant}>{expiry.label}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatSize(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(d);
                  }}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-100 hover:text-danger-700"
                  aria-label={`Remove ${d.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            );
          })}
        </div>
        {documents.length === 0 && <EmptyState icon={<FileText className="h-8 w-8" />} title="No documents uploaded yet" className="py-6" />}
        {deleteError && (
          <div className="mb-4">
            <Alert variant="error">{deleteError}</Alert>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-2 border-t border-border pt-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Signed offer letter" required />
            </div>
            <div className="w-36">
              <Label>Type</Label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Label>Expires (optional)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>File</Label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-xs text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
              />
            </div>
            <Button type="submit" loading={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
        {error && (
          <div className="mt-2">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Max 10MB. Stored locally in dev — swap lib/storage.ts for S3/GCS in production.</p>
      </CardContent>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Remove document?"
        description={`This can't be undone. "${deleteTarget?.title ?? ""}" will be permanently removed.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
