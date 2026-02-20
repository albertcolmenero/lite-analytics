"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

export function MiniChart({ data, color = "#3b82f6" }: { data: { date: string; views: number }[]; color?: string }) {
    const id = `mini-${color.replace("#", "")}`;
    return (
        <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="views"
                    stroke={color}
                    fill={`url(#${id})`}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
