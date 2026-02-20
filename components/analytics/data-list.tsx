import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DataList({ title, data }: { title: string; data: { name: string; count: number }[] }) {
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
                    <div className="space-y-3">
                        {data.map((item, i) => (
                            <div key={i} className="group flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="truncate text-sm font-medium" title={item.name}>
                                            {item.name}
                                        </span>
                                        <span className="ml-2 shrink-0 text-sm tabular-nums text-muted-foreground">
                                            {item.count.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                            style={{ width: `${(item.count / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
