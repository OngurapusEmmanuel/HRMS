import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// A user may manage documents on an employee record if they're HR/Admin,
// or if the record IS their own employee profile (self-service uploads:
// ID copies, signed offer letters, etc).
async function canManageDocuments(session: any, targetEmployeeId: string) {
  const role = session.user.role;
  if (role === "ADMIN" || role === "HR") return true;
  return session.user.employeeId === targetEmployeeId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canManageDocuments(session, params.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documents);
}

// POST /api/employees/:id/documents — multipart/form-data with fields: file, title
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canManageDocuments(session, params.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const title = form.get("title");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const saved = await saveFile(file);
  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: params.id,
      title: title.trim(),
      fileUrl: saved.url,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      uploadedById: (session.user as any).employeeId ?? null,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
