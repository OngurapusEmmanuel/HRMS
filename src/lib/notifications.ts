import { prisma } from "./db";
import { NotificationType } from "@prisma/client";

type NotifyOne = {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

export async function notify(params: NotifyOne) {
  try {
    await prisma.notification.create({ data: params });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

// Same as notify(), but for N distinct targeted notifications known up
// front (e.g. a cron job's per-employee reminders) — one createMany instead
// of N sequential inserts. Not for the "broadcast to every user with a role"
// case; that's notifyRoles() below.
export async function notifyMany(items: NotifyOne[]) {
  if (items.length === 0) return;
  try {
    await prisma.notification.createMany({ data: items });
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }
}

// Notify every user in the org holding one of the given roles — used for
// "a new leave request needs review" style alerts where the exact recipient
// (which HR person) doesn't matter, only that someone with the role sees it.
export async function notifyRoles(params: {
  organizationId: string;
  roles: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  excludeUserId?: string;
}) {
  try {
    const users = await prisma.user.findMany({
      where: {
        organizationId: params.organizationId,
        role: { in: params.roles as any[] },
        ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      })),
    });
  } catch (err) {
    console.error("Failed to create role notifications:", err);
  }
}
