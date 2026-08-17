"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/cn";

type LeaveDay = {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: string;
};

const DOT_COLORS = ["bg-primary-500", "bg-success-500", "bg-warning-500", "bg-info-500", "bg-danger-500"];

function colorFor(employeeName: string) {
  let hash = 0;
  for (let i = 0; i < employeeName.length; i++) hash = (hash * 31 + employeeName.charCodeAt(i)) >>> 0;
  return DOT_COLORS[hash % DOT_COLORS.length];
}

export default function TeamCalendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [leaves, setLeaves] = useState<LeaveDay[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaves/calendar?month=${format(month, "yyyy-MM")}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (cancelled) return;
        const mapped: LeaveDay[] = data.map((r) => ({
          id: r.id,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          startDate: r.startDate,
          endDate: r.endDate,
          type: r.type,
        }));
        setLeaves(mapped);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function leavesOn(day: Date) {
    if (!leaves) return [];
    return leaves.filter((l) => isWithinInterval(day, { start: new Date(l.startDate), end: new Date(l.endDate) }));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-surface-2 px-2 py-1.5 text-center font-medium text-muted">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayLeaves = leavesOn(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[72px] bg-surface p-1.5",
                !isSameMonth(day, month) && "opacity-40",
                isSameDay(day, new Date()) && "ring-1 ring-inset ring-primary-500"
              )}
            >
              <span className="text-[11px] text-muted">{format(day, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {dayLeaves.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center gap-1 truncate text-[10px] text-secondary" title={`${l.employeeName} · ${l.type}`}>
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colorFor(l.employeeName))} />
                    <span className="truncate">{l.employeeName}</span>
                  </div>
                ))}
                {dayLeaves.length > 3 && <p className="text-[10px] text-muted">+{dayLeaves.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
      {loading && <p className="mt-2 text-xs text-muted">Loading…</p>}
      {!loading && leaves && leaves.length === 0 && (
        <p className="mt-2 text-xs text-muted">No approved leave this month.</p>
      )}
    </div>
  );
}
