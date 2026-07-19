"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className={depth > 0 ? "ml-6 border-l border-gray-200 pl-6" : ""}>
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "+" : "−"}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex-1 max-w-sm">
          <Link href={`/employees/${node.id}`} className="font-medium text-sm text-brand-600 hover:underline">
            {node.name}
          </Link>
          <p className="text-xs text-gray-500">{node.jobTitle}</p>
          {node.department && <p className="text-xs text-gray-400">{node.department}</p>}
          {hasChildren && (
            <p className="text-xs text-gray-400 mt-1">
              {node.children.length} direct report{node.children.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {hasChildren && !collapsed && (
        <div>
          {node.children.map((child) => (
            <OrgChartNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
