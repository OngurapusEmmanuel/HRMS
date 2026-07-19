import { prisma } from "./db";

type LogParams = {
  organizationId: string;
  actorUserId: string;
  actorEmail: string;
  action: string; // dot-namespaced, e.g. "leave.approve", "employee.terminate"
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

// Fire-and-forget by convention at call sites (never awaited into a request's
// critical path, never inside the same $transaction as the business write) —
// a logging failure should never roll back or block the action it's describing.
export async function logAudit(params: LogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        actorEmail: params.actorEmail,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as any,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
