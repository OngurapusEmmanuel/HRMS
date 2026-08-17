"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getChartColors } from "./chart-theme";

type Summary = {
  headcountTrend: { month: string; label: string; headcount: number }[];
  turnoverTrend: { month: string; label: string; terminations: number; turnoverRate: number }[];
  departmentBreakdown: { department: string; headcount: number; monthlyLaborCost: number }[];
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Categorical hues are a fixed 8-slot palette — never cycled. Beyond 8
// departments, fold the smallest into "Other" (neutral, not a hue slot)
// rather than reusing a color and implying a false identity match.
const MAX_CATEGORICAL_SLOTS = 8;

function foldDepartments(rows: Summary["departmentBreakdown"]) {
  if (rows.length <= MAX_CATEGORICAL_SLOTS) return rows;
  const sorted = [...rows].sort((a, b) => b.headcount - a.headcount);
  const top = sorted.slice(0, MAX_CATEGORICAL_SLOTS - 1);
  const rest = sorted.slice(MAX_CATEGORICAL_SLOTS - 1);
  const other = rest.reduce(
    (acc, r) => ({
      department: "Other",
      headcount: acc.headcount + r.headcount,
      monthlyLaborCost: acc.monthlyLaborCost + r.monthlyLaborCost,
    }),
    { department: "Other", headcount: 0, monthlyLaborCost: 0 }
  );
  return [...top, other];
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-popover">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-secondary">
          {p.name ?? p.dataKey}: <span className="font-medium text-foreground">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsCharts({ summary }: { summary: Summary }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const colors = getChartColors(mounted && resolvedTheme === "dark");
  const departments = foldDepartments(summary.departmentBreakdown);
  const NEUTRAL = mounted && resolvedTheme === "dark" ? "#7c8399" : "#8891a8";
  const colorFor = (i: number, department: string) =>
    department === "Other" ? NEUTRAL : colors.categorical[i % colors.categorical.length];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Headcount Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary.headcountTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" fontSize={12} stroke={colors.axis} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} stroke={colors.axis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="headcount" stroke={colors.primary} strokeWidth={2} dot={false} name="Headcount" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turnover Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary.turnoverTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" fontSize={12} stroke={colors.axis} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} stroke={colors.axis} tickLine={false} axisLine={false} unit="%" />
              <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
              <Line
                type="monotone"
                dataKey="turnoverRate"
                stroke={colors.primary}
                strokeWidth={2}
                dot={false}
                name="Turnover rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={departments}
                  dataKey="headcount"
                  nameKey="department"
                  outerRadius={90}
                  label
                >
                  {departments.map((d, i) => (
                    <Cell key={d.department} fill={colorFor(i, d.department)} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Labor Cost by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departments}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="department" fontSize={11} stroke={colors.axis} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} stroke={colors.axis} tickLine={false} axisLine={false} tickFormatter={(v) => money(v)} />
                <Tooltip content={<ChartTooltip formatter={money} />} />
                <Bar dataKey="monthlyLaborCost" name="Monthly labor cost" radius={[4, 4, 0, 0]}>
                  {departments.map((d, i) => (
                    <Cell key={d.department} fill={colorFor(i, d.department)} />
                  ))}
                  <LabelList dataKey="monthlyLaborCost" position="top" formatter={money} fontSize={11} fill={colors.axis} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
