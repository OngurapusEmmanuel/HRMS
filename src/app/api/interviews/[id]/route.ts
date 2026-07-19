import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

const schema = z.object({
  outcome: z.enum(["PENDING", "PASS", "FAIL"]).optional(),
  notes: z.string().optional(),
});

// PATCH /api/interviews/:id — record the outcome/notes after it happens.
// Any recruitment-manage role can update it, not just the interviewer —
// HR often collates feedback on the interviewer's behalf.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.interview.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.interview.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}
