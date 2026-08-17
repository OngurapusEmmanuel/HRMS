"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Network,
  Briefcase,
  ClipboardCheck,
  GraduationCap,
  CalendarClock,
  Clock,
  Wallet,
  ScrollText,
  Settings,
  ShieldCheck,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Building,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  employees: Users,
  departments: Building2,
  "org-chart": Network,
  recruitment: Briefcase,
  appraisals: ClipboardCheck,
  goals: Target,
  learning: GraduationCap,
  leaves: CalendarClock,
  attendance: Clock,
  payroll: Wallet,
  "audit-log": ScrollText,
  settings: Settings,
  compliance: ShieldCheck,
  reports: BarChart3,
};

export type NavLink = { href: string; label: string; iconKey: string };
export type NavGroup = { label: string; links: NavLink[] };

const COLLAPSE_KEY = "sidebar:collapsed";

export default function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150",
        collapsed ? "w-[72px]" : "w-60",
        mounted ? "" : "invisible"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white">
          <Building className="h-4 w-4" />
        </span>
        {!collapsed && <span className="truncate text-sm font-semibold text-foreground">HR System</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-wide text-muted">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = icons[link.iconKey] ?? LayoutDashboard;
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed ? link.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                        : "text-secondary hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={toggle}
        className="m-3 mt-0 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
