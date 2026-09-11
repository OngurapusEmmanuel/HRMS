"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export type OrgNode = {
  id: string;
  name: string;
  jobTitle: string;
  department: string | null;
  children: OrgNode[];
};

export default function OrgChartNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l border-border pl-6" : ""}>
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <div className="flex max-w-sm flex-1 items-start gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-soft transition-all hover:border-primary-200 hover:shadow-md dark:hover:border-primary-800">
          <Avatar name={node.name} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/employees/${node.id}`}
              className="truncate text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {node.name}
            </Link>
            <p className="truncate text-xs text-secondary">{node.jobTitle}</p>
            {node.department && <p className="truncate text-xs text-muted">{node.department}</p>}
            {hasChildren && (
              <p className={cn("mt-1 flex items-center gap-1 text-xs text-muted")}>
                <Users className="h-3 w-3" />
                {node.children.length} direct report{node.children.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      </div>

      {hasChildren && !collapsed && (
        <div className="animate-fade-in">
          {node.children.map((child) => (
            <OrgChartNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
