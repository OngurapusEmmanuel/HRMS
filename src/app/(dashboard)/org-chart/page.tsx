import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrgChartNode, { OrgNode } from "@/components/OrgChartNode";

export default async function OrgChartPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;

  const employees = await prisma.employee.findMany({
    where: { organizationId, status: { not: "TERMINATED" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      reportsToId: true,
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  // Build parent -> children map once, then recursively assemble trees from
  // it. Employees whose reportsToId points outside the fetched set (data
  // integrity edge case) are treated as roots rather than dropped silently.
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string, typeof employees>();
  for (const e of employees) {
    const key = e.reportsToId && byId.has(e.reportsToId) ? e.reportsToId : "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(e);
  }

  function buildNode(e: (typeof employees)[number]): OrgNode {
    return {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      jobTitle: e.jobTitle,
      department: e.department?.name ?? null,
      children: (childrenOf.get(e.id) ?? []).map(buildNode),
    };
  }

  const roots = (childrenOf.get("__root__") ?? []).map(buildNode);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Org Chart</h1>
      <p className="text-sm text-gray-500 mb-6">
        Based on each employee's reporting line. Click − to collapse a branch.
      </p>

      {roots.length === 0 && <p className="text-gray-400 text-sm">No employees to display.</p>}
      {roots.map((root) => (
        <OrgChartNode key={root.id} node={root} />
      ))}
    </div>
  );
}
