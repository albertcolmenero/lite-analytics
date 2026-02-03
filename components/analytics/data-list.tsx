import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DataList({ title, data }: { title: string, data: { name: string, count: number }[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center">
                            <div className="ml-4 space-y-1 w-full">
                                <p className="text-sm font-medium leading-none truncate" title={item.name}>{item.name}</p>
                                <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="bg-primary h-full"
                                        style={{ width: `${Math.min(100, (item.count / Math.max(...data.map(d => d.count), 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="ml-auto font-medium text-sm tabular-nums">{item.count}</div>
                        </div>
                    ))}
                    {data.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No data available</div>}
                </div>
            </CardContent>
        </Card>
    )
}
