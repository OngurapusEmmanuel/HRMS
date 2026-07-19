import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { deleteFile } from "@/lib/storage";

// DELETE /api/employees/:id/documents/:docId — HR/Admin only. Employees can
// upload their own documents but can't remove HR-managed records themselves,
// keeping the audit trail intact.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "employee:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: params.docId, employeeId: params.id, employee: { organizationId: (session.user as any).organizationId } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.employeeDocument.delete({ where: { id: doc.id } });

  // Cleanup happens after the DB record is gone and is best-effort — a
  // storage hiccup shouldn't leave a dangling, un-deletable document row.
  await deleteFile(doc.fileUrl);

  return NextResponse.json({ success: true });
}
