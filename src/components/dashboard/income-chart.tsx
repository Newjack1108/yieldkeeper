"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface IncomeChartProps {
  data: { month: string; income: number }[];
}

export function IncomeChart({ data }: IncomeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--muted-foreground)"
        />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: "#e5e5e5" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "#e5e5e5" }}
          tickFormatter={(v) => `£${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          formatter={(value) => [`£${Number(value) || 0}`, "Income"]}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ fill: "var(--chart-1)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
