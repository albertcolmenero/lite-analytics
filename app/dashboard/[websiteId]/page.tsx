import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAnalytics, getLiveVisitors, getPeriodDates, type Period } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrafficChart } from "@/components/analytics/traffic-chart";
import { DataList } from "@/components/analytics/data-list";
import { TimeRangeSelector } from "@/components/analytics/time-range-selector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    ArrowLeft, Eye, Users, MousePointerClick, Settings, ExternalLink,
    ArrowUpRight, ArrowDownRight, Minus, TrendingDown, Zap, Tag, Megaphone,
} from "lucide-react";

const VALID_PERIODS = new Set(["24h", "7d", "30d", "90d"]);

function DeltaBadge({ value }: { value: number }) {
    if (Math.abs(value) < 0.1) {
        return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="size-3" />0%</span>;
    }
    const positive = value > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {positive ? "+" : ""}{value.toFixed(1)}%
        </span>
    );
}

function StatCard({ icon: Icon, iconBg, label, value, delta }: {
    icon: React.ElementType; iconBg: string; label: string; value: string; delta?: number;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold tabular-nums">{value}</p>
                            {delta !== undefined && <DeltaBadge value={delta} />}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default async function WebsiteDashboardPage({
    params,
    searchParams: searchParamsPromise,
}: {
    params: Promise<{ websiteId: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const { websiteId } = await params;
    const searchParams = await searchParamsPromise;
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const website = await prisma.website.findUnique({
        where: { id: websiteId, ownerId: userId },
    });
    if (!website) notFound();

    const period: Period = VALID_PERIODS.has(searchParams.period ?? "") ? (searchParams.period as Period) : "30d";
    const { from, to, label: periodLabel } = getPeriodDates(period);

    const [analytics, liveCount] = await Promise.all([
        getAnalytics(website.id, { from, to }, period),
        getLiveVisitors(website.id),
    ]);

    const hasData = analytics.overview.totalPageviews > 0;

    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const scriptTag = `<script defer src="${baseUrl}/tracker.js" data-website-id="${website.id}"></script>`;

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/dashboard"><ArrowLeft className="size-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight">{website.domain}</h1>
                            <a href={`https://${website.domain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                                <ExternalLink className="size-3.5" />
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{periodLabel}</span>
                            {liveCount > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="relative flex size-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                    </span>
                                    {liveCount} online now
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <TimeRangeSelector current={period} />
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/setup?websiteId=${website.id}`}>
                            <Settings className="size-4" />
                            <span className="hidden sm:inline">Setup</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {!hasData ? (
                /* ── Empty state ──────────────────────────────────────── */
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle>Waiting for data</CardTitle>
                        <CardDescription>
                            No events received for <strong>{website.domain}</strong> yet. Add the tracking script to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                            <code className="break-all">{scriptTag}</code>
                        </div>
                        <Button size="sm" asChild>
                            <Link href={`/dashboard/setup?websiteId=${website.id}`}>Full Instructions</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── Stat cards ──────────────────────────────────── */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={Users} iconBg="bg-blue-500/10 text-blue-500"
                            label="Unique Visitors" value={analytics.overview.totalVisitors.toLocaleString()}
                            delta={analytics.overview.deltas.visitors}
                        />
                        <StatCard
                            icon={Eye} iconBg="bg-emerald-500/10 text-emerald-500"
                            label="Page Views" value={analytics.overview.totalPageviews.toLocaleString()}
                            delta={analytics.overview.deltas.pageviews}
                        />
                        <StatCard
                            icon={TrendingDown} iconBg="bg-amber-500/10 text-amber-500"
                            label="Bounce Rate" value={`${(analytics.overview.bounceRate * 100).toFixed(1)}%`}
                            delta={analytics.overview.deltas.bounceRate}
                        />
                        <StatCard
                            icon={MousePointerClick} iconBg="bg-violet-500/10 text-violet-500"
                            label="Views / Visitor" value={analytics.overview.viewsPerVisitor.toFixed(1)}
                        />
                    </div>

                    {/* ── Traffic chart ────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Traffic Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TrafficChart data={analytics.chartData} hourly={period === "24h"} />
                        </CardContent>
                    </Card>

                    {/* ── Primary breakdowns ───────────────────────────── */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <DataList title="Top Pages" data={analytics.topPages} total={analytics.overview.totalPageviews} />
                        <DataList title="Referrers" data={analytics.topReferrers} total={analytics.overview.totalPageviews} />
                        <DataList title="Countries" data={analytics.topCountries} total={analytics.overview.totalPageviews} />
                    </div>

                    {/* ── Tech breakdowns ──────────────────────────────── */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <DataList title="Devices" data={analytics.topDevices} total={analytics.overview.totalPageviews} />
                        <DataList title="Browsers" data={analytics.topBrowsers} total={analytics.overview.totalPageviews} />
                        <DataList title="Operating Systems" data={analytics.topOS} total={analytics.overview.totalPageviews} />
                    </div>

                    {/* ── UTM & Custom Events ─────────────────────────── */}
                    {(analytics.utmSources.length > 0 || analytics.utmCampaigns.length > 0 || analytics.customEvents.length > 0) && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {analytics.utmSources.length > 0 && (
                                <DataList title="UTM Sources" data={analytics.utmSources} total={analytics.overview.totalPageviews} />
                            )}
                            {analytics.utmCampaigns.length > 0 && (
                                <DataList title="UTM Campaigns" data={analytics.utmCampaigns} total={analytics.overview.totalPageviews} />
                            )}
                            {analytics.customEvents.length > 0 && (
                                <DataList title="Custom Events" data={analytics.customEvents} />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
