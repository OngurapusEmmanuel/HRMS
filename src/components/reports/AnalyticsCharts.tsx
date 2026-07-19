"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Summary = {
  headcountTrend: { month: string; label: string; headcount: number }[];
  turnoverTrend: { month: string; label: string; terminations: number; turnoverRate: number }[];
  departmentBreakdown: { department: string; headcount: number; monthlyLaborCost: number }[];
};

const COLORS = ["#3b5bdb", "#5c7cfa", "#748ffc", "#91a7ff", "#a5b4fc", "#c1c2ff"];

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AnalyticsCharts({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Headcount Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={summary.headcountTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="headcount" stroke="#3b5bdb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Turnover Rate</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={summary.turnoverTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} unit="%" />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line type="monotone" dataKey="turnoverRate" stroke="#e8590c" strokeWidth={2} dot={false} name="Turnover rate" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Headcount by Department</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={summary.departmentBreakdown} dataKey="headcount" nameKey="department" outerRadius={90} label>
                {summary.departmentBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Labor Cost by Department</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.departmentBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="department" fontSize={11} />
              <YAxis fontSize={12} tickFormatter={(v) => money(v)} />
              <Tooltip formatter={(value: number) => money(value)} />
              <Bar dataKey="monthlyLaborCost" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
