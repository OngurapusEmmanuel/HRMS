"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    const res = await fetch(`/api/employees/${employeeId}/documents`, { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      return;
    }
    const doc = await res.json();
    setDocuments((prev) => [doc, ...prev]);
    setTitle("");
    setFile(null);
    router.refresh();
  }

  async function handleDelete(docId: string) {
    const res = await fetch(`/api/employees/${employeeId}/documents/${docId}`, { method: "DELETE" });
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Documents</h2>

      <div className="divide-y divide-gray-100 mb-4">
        {documents.map((d) => (
          <div key={d.id} className="py-3 flex items-center justify-between text-sm">
            <div>
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-medium">
                {d.title}
              </a>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatSize(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString()}
              </p>
            </div>
            {canDelete && (
              <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:underline text-xs">
                Remove
              </button>
            )}
          </div>
        ))}
        {documents.length === 0 && <p className="py-3 text-gray-400 text-sm">No documents uploaded yet.</p>}
      </div>

      <form onSubmit={handleUpload} className="flex items-end gap-2 text-sm border-t border-gray-100 pt-4">
        <div className="flex-1">
          <label className="block text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Signed offer letter"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-gray-700 mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="w-full text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      <p className="text-xs text-gray-400 mt-2">Max 10MB. Stored locally in dev — swap lib/storage.ts for S3/GCS in production.</p>
    </div>
  );
}
