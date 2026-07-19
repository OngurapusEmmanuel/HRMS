import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/departments", label: "Departments" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/leaves", label: "Leave Requests" },
  { href: "/attendance", label: "Attendance" },
  { href: "/appraisals", label: "Appraisals" },
  { href: "/learning", label: "Learning & Development" },
  { href: "/payroll", label: "Payroll" },
  { href: "/org-chart", label: "Org Chart" },
];

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  let links = baseLinks;
  if (can(role, "audit:view")) links = [...links, { href: "/audit-log", label: "Audit Log" }];
  if (can(role, "settings:manage")) links = [...links, { href: "/settings", label: "Settings" }];
  if (can(role, "compliance:manage")) links = [...links, { href: "/compliance", label: "Compliance" }];
  if (can(role, "reports:view")) links = [...links, { href: "/reports", label: "Reports & Analytics" }];

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen p-4">
      <div className="font-semibold text-lg text-brand-600 mb-6 px-2">HR System</div>
      <nav className="space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
