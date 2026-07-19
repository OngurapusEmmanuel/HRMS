import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/feedback-requests — the current user's own pending/submitted
// feedback asks (requests where they're the provider). This is the "my
// tasks" view, distinct from GET /api/employees/:id/feedback-requests which
// is the subject-facing (sanitized) view.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const providerId = (session.user as any).employeeId;
  if (!providerId) return NextResponse.json([]);

  const requests = await prisma.feedbackRequest.findMany({
    where: { providerId, organizationId: (session.user as any).organizationId },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: [{ submitted: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(requests);
}
