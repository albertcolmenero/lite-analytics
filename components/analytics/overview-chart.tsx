"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

export function OverviewChart({ data }: { data: { date: string, views: number, visitors: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                />
                <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="#2563eb"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Unique Visitors"
                />
                <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Page Views"
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
