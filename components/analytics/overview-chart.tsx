"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { format, parseISO } from "date-fns"

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length || !label) return null;
    return (
        <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
                {format(parseISO(label), "MMM d, yyyy")}
            </p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{entry.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    )
}

export function OverviewChart({ data }: { data: { date: string; views: number; visitors: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(value) => {
                        try { return format(parseISO(value), "MMM d"); } catch { return value; }
                    }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                />
                <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v) => (v === 0 ? "0" : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
                    width={40}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#10b981"
                    fill="url(#fillViews)"
                    strokeWidth={2}
                    dot={false}
                    name="Page Views"
                />
                <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#3b82f6"
                    fill="url(#fillVisitors)"
                    strokeWidth={2}
                    dot={false}
                    name="Visitors"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
