import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  comments: z.string().optional(),
});

// PATCH /api/feedback-requests/:id — only the assigned provider can submit
// their own feedback; once submitted it's immutable (same "review history
// is immutable" principle as Appraisal).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const providerId = (session.user as any).employeeId;
  const existing = await prisma.feedbackRequest.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.providerId !== providerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (existing.submitted) return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.feedbackRequest.update({
    where: { id: params.id },
    data: { ...parsed.data, submitted: true, submittedAt: new Date() },
  });
  return NextResponse.json(updated);
}
