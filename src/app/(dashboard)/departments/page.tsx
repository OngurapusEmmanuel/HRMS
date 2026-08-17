import { Building2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddDepartmentButton from "@/components/AddDepartmentButton";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const departments = await prisma.department.findMany({
    where: { organizationId },
    include: { _count: { select: { employees: true } }, manager: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Departments"
        description={`${departments.length} department${departments.length === 1 ? "" : "s"} in your organization.`}
        actions={<>{can(role, "department:manage") && <AddDepartmentButton />}</>}
      />

      {departments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No departments yet"
            description="Add your first department to get started."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id}>
              <CardContent>
                <p className="font-medium text-foreground">{d.name}</p>
                <p className="mt-1 text-sm text-secondary">
                  {d._count.employees} employee{d._count.employees === 1 ? "" : "s"}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {d.manager ? (
                    <>
                      <Avatar name={`${d.manager.firstName} ${d.manager.lastName}`} size="sm" />
                      <span className="text-xs text-muted">
                        {d.manager.firstName} {d.manager.lastName}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Unassigned manager</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
