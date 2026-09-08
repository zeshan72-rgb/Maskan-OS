"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

const NEUTRAL = "#d4d4d4";
const ACCENT = "#0f172a";
const CATEGORY_COLOURS = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];

/** Rent collected vs expected over the last six months. */
export function CollectionTrendChart({ data }: { data: { month: string; expected: number; collected: number }[] }) {
  const hasData = data.some((d) => d.expected > 0);

  if (!hasData) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-neutral-400">
        No rent instalments in this period yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          cursor={{ fill: "#f8fafc" }}
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
          formatter={(value: number, name: string) => [formatCurrency(value), name === "expected" ? "Expected" : "Collected"]}
        />
        <Bar dataKey="expected" fill={NEUTRAL} radius={[4, 4, 0, 0]} animationDuration={700} />
        <Bar dataKey="collected" fill={ACCENT} radius={[4, 4, 0, 0]} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Open maintenance requests grouped by category. */
export function MaintenanceCategoryChart({ data }: { data: { category: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-neutral-400">
        No open maintenance requests.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="category"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <Tooltip
          cursor={{ fill: "#f8fafc" }}
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 12 }}
          formatter={(value: number) => [`${value} request${value === 1 ? "" : "s"}`, "Open"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={700}>
          {data.map((_, index) => (
            <Cell key={index} fill={CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
