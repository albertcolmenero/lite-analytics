import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DataList({ title, data, total }: { title: string; data: { name: string; count: number }[]; total?: number }) {
    const max = Math.max(...data.map(d => d.count), 1);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
                ) : (
                    <div className="space-y-2.5">
                        {data.map((item, i) => {
                            const pct = total && total > 0 ? (item.count / total) * 100 : null;
                            return (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="min-w-0 truncate text-sm" title={item.name}>
                                            {item.name}
                                        </span>
                                        <div className="ml-3 flex shrink-0 items-center gap-2">
                                            <span className="text-sm font-medium tabular-nums">
                                                {item.count.toLocaleString()}
                                            </span>
                                            {pct !== null && (
                                                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                                                    {pct < 0.1 ? "<0.1" : pct.toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-primary/50 transition-all duration-500"
                                            style={{ width: `${(item.count / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
