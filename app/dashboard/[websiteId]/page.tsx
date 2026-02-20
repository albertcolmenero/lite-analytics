import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAnalytics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OverviewChart } from "@/components/analytics/overview-chart";
import { DataList } from "@/components/analytics/data-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { subDays } from "date-fns";
import { ArrowLeft, Eye, Users, MousePointerClick, Settings, ExternalLink, Copy } from "lucide-react";

export default async function WebsiteDashboardPage({ params }: { params: Promise<{ websiteId: string }> }) {
    const { websiteId } = await params;
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const website = await prisma.website.findUnique({
        where: { id: websiteId, ownerId: userId },
    });

    if (!website) notFound();

    const to = new Date();
    const from = subDays(to, 30);
    const analytics = await getAnalytics(website.id, { from, to });
    const hasData = analytics.overview.totalPageviews > 0;

    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const scriptTag = `<script defer src="${baseUrl}/tracker.js" data-website-id="${website.id}"></script>`;

    const viewsPerVisitor = analytics.overview.totalVisitors > 0
        ? (analytics.overview.totalPageviews / analytics.overview.totalVisitors).toFixed(1)
        : "0";

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{website.domain}</h1>
                            <a
                                href={`https://${website.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ExternalLink className="size-4" />
                            </a>
                        </div>
                        <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/setup?websiteId=${website.id}`}>
                        <Settings className="size-4" />
                        Setup
                    </Link>
                </Button>
            </div>

            {!hasData ? (
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
                        <div className="flex gap-2">
                            <Button size="sm" asChild>
                                <Link href={`/dashboard/setup?websiteId=${website.id}`}>Full Instructions</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                                        <Users className="size-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Unique Visitors</p>
                                        <p className="text-2xl font-bold tabular-nums">{analytics.overview.totalVisitors.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                        <Eye className="size-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Page Views</p>
                                        <p className="text-2xl font-bold tabular-nums">{analytics.overview.totalPageviews.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
                                        <MousePointerClick className="size-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Views / Visitor</p>
                                        <p className="text-2xl font-bold tabular-nums">{viewsPerVisitor}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Traffic Chart */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Traffic Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OverviewChart data={analytics.chartData} />
                        </CardContent>
                    </Card>

                    {/* Data Breakdowns */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <DataList title="Top Pages" data={analytics.topPages} />
                        <DataList title="Referrers" data={analytics.topReferrers} />
                        <DataList title="Countries" data={analytics.topCountries} />
                        <DataList title="Devices" data={analytics.topDevices} />
                        <DataList title="Browsers" data={analytics.topBrowsers} />
                        <DataList title="Operating Systems" data={analytics.topOS} />
                    </div>
                </>
            )}
        </div>
    );
}
