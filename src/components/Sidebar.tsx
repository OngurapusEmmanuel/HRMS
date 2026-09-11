import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import SidebarNav, { type NavGroup } from "@/components/SidebarNav";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  const groups: NavGroup[] = [
    { label: "Overview", links: [{ href: "/dashboard", label: "Dashboard", iconKey: "dashboard" }] },
    {
      label: "People",
      links: [
        { href: "/employees", label: "Employees", iconKey: "employees" },
        { href: "/departments", label: "Departments", iconKey: "departments" },
        { href: "/org-chart", label: "Org Chart", iconKey: "org-chart" },
      ],
    },
    {
      label: "Talent",
      links: [
        { href: "/recruitment", label: "Recruitment", iconKey: "recruitment" },
        { href: "/appraisals", label: "Appraisals", iconKey: "appraisals" },
        { href: "/goals", label: "Goals", iconKey: "goals" },
        { href: "/feedback", label: "Feedback", iconKey: "feedback" },
        { href: "/learning", label: "Learning & Development", iconKey: "learning" },
      ],
    },
    {
      label: "Time",
      links: [
        { href: "/leaves", label: "Leave Requests", iconKey: "leaves" },
        { href: "/attendance", label: "Attendance", iconKey: "attendance" },
      ],
    },
    { label: "Finance", links: [{ href: "/payroll", label: "Payroll", iconKey: "payroll" }] },
  ];

  const adminLinks: NavGroup["links"] = [];
  if (can(role, "audit:view")) adminLinks.push({ href: "/audit-log", label: "Audit Log", iconKey: "audit-log" });
  if (can(role, "compliance:manage")) adminLinks.push({ href: "/compliance", label: "Compliance", iconKey: "compliance" });
  if (can(role, "reports:view")) adminLinks.push({ href: "/reports", label: "Reports & Analytics", iconKey: "reports" });
  if (can(role, "settings:manage")) adminLinks.push({ href: "/settings", label: "Settings", iconKey: "settings" });
  if (adminLinks.length > 0) groups.push({ label: "Admin", links: adminLinks });

  return <SidebarNav groups={groups} />;
}
