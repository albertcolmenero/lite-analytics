import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWebsitesSummary } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MiniChart } from "@/components/analytics/mini-chart";
import Link from "next/link";
import { Plus, Globe, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

function DeltaBadge({ delta }: { delta: number }) {
    if (delta === 0) {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Minus className="size-3" /> 0%
            </span>
        );
    }
    const positive = delta > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {positive ? "+" : ""}{delta.toFixed(1)}%
        </span>
    );
}

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const websites = await getWebsitesSummary(userId);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Your Websites</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {websites.length === 0
                            ? "Get started by adding your first website"
                            : `Monitoring ${websites.length} website${websites.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/new">
                        <Plus className="size-4" />
                        Add Website
                    </Link>
                </Button>
            </div>

            {websites.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                            <Globe className="size-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-1 text-lg font-semibold">No websites yet</h3>
                        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                            Add your first website to start tracking page views, visitors, and more.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/new">
                                <Plus className="size-4" />
                                Add Your First Website
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {websites.map((site) => (
                        <Link key={site.id} href={`/dashboard/${site.id}`} className="group">
                            <Card className="transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-md">
                                <CardContent className="pt-6">
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                    <Globe className="size-4 text-primary" />
                                                </div>
                                                <h3 className="truncate font-semibold" title={site.domain}>
                                                    {site.domain}
                                                </h3>
                                            </div>
                                        </div>
                                        <DeltaBadge delta={site.delta} />
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-3xl font-bold tabular-nums">{site.currentViews.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            visits last 7 days &middot; {site.currentVisitors.toLocaleString()} unique
                                        </p>
                                    </div>

                                    <MiniChart data={site.chartData} />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
