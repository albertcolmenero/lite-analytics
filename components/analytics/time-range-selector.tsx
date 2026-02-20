"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

const periods = [
    { label: "24h", value: "24h" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
] as const;

export function TimeRangeSelector({ current }: { current: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function select(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", value);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1">
            {periods.map((p) => (
                <button
                    key={p.value}
                    onClick={() => select(p.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        current === p.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
