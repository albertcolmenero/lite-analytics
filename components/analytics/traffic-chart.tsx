"use client"

import { useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { format, parseISO } from "date-fns"

type ChartMode = "visitors" | "views" | "both";

const TABS: { label: string; value: ChartMode }[] = [
    { label: "Visitors", value: "visitors" },
    { label: "Page Views", value: "views" },
    { label: "Both", value: "both" },
];

function CustomTooltip({ active, payload, label, hourly }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; hourly?: boolean }) {
    if (!active || !payload?.length || !label) return null;
    let formatted = label;
    try {
        formatted = hourly
            ? format(parseISO(label.replace(" ", "T")), "MMM d, h a")
            : format(parseISO(label), "MMM d, yyyy");
    } catch { /* fallback to raw */ }

    return (
        <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-card-foreground">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{formatted}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{entry.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

export function TrafficChart({ data, hourly = false }: { data: { date: string; views: number; visitors: number }[]; hourly?: boolean }) {
    const [mode, setMode] = useState<ChartMode>("both");

    const showVisitors = mode === "visitors" || mode === "both";
    const showViews = mode === "views" || mode === "both";

    return (
        <div>
            <div className="mb-4 flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setMode(tab.value)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                            mode === tab.value
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                    <XAxis
                        dataKey="date"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--color-muted-foreground)" }}
                        tickFormatter={(value) => {
                            try {
                                return hourly
                                    ? format(parseISO(value.replace(" ", "T")), "ha").toLowerCase()
                                    : format(parseISO(value), "MMM d");
                            } catch { return value; }
                        }}
                        interval="preserveStartEnd"
                        minTickGap={hourly ? 60 : 40}
                    />
                    <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--color-muted-foreground)" }}
                        tickFormatter={(v) => (v === 0 ? "0" : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
                        width={36}
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip hourly={hourly} />} />
                    {showViews && (
                        <Area type="monotone" dataKey="views" stroke="#10b981" fill="url(#gViews)" strokeWidth={2} dot={false} name="Page Views" />
                    )}
                    {showVisitors && (
                        <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fill="url(#gVisitors)" strokeWidth={2} dot={false} name="Visitors" />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
