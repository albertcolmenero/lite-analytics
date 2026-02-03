import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAnalytics, getUserWebsites } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OverviewChart } from "@/components/analytics/overview-chart";
import { DataList } from "@/components/analytics/data-list";
import { WebsiteSelector } from "@/components/analytics/website-selector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { subDays } from "date-fns";
import { env } from "@/lib/env";

export default async function DashboardPage(props: { searchParams: Promise<{ websiteId?: string, timeframe?: string }> }) {
    const searchParams = await props.searchParams;
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const websites = await getUserWebsites(userId);

    if (websites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle>Welcome to Lite Analytics</CardTitle>
                        <CardDescription>Get started by adding your first website.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/new">Add Website</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const selectedWebsiteId = searchParams.websiteId || websites[0].id;
    const selectedWebsite = websites.find(w => w.id === selectedWebsiteId) || websites[0];

    // Date Range (default 30 days)
    const to = new Date();
    const from = subDays(to, 30);

    const analytics = await getAnalytics(selectedWebsite.id, { from, to });
    const hasData = analytics.overview.totalPageviews > 0;
    const scriptTag = `<script defer src="${env.NEXT_PUBLIC_APP_URL}/tracker.js" data-website-id="${selectedWebsite.id}"></script>`;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground hidden md:block">Analytics for {selectedWebsite.domain}</p>
                </div>
                <div className="flex gap-4">
                    <WebsiteSelector websites={websites} selectedId={selectedWebsite.id} />
                    <Button asChild variant="outline">
                        <Link href={`/dashboard/setup?websiteId=${selectedWebsite.id}`}>Setup Instructions</Link>
                    </Button>
                </div>
            </div>

            {!hasData ? (
                <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900/50">
                    <CardHeader>
                        <CardTitle>Waiting for Data</CardTitle>
                        <CardDescription>We haven't received any events for <strong>{selectedWebsite.domain}</strong> yet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">To start tracking, add this script to your website's <code>&lt;head&gt;</code> or <code>&lt;body&gt;</code>:</p>
                        <div className="bg-slate-950 p-4 rounded-md overflow-x-auto relative group">
                            <code className="text-sm text-white whitespace-pre-wrap">{scriptTag}</code>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild size="sm">
                                <Link href={`/dashboard/setup?websiteId=${selectedWebsite.id}`}>View Full Instructions</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={process.env.NEXT_PUBLIC_APP_URL + "/tracker.js"} target="_blank">View Script</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Overview Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.overview.totalVisitors}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.overview.totalPageviews}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Views / Visitor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {analytics.overview.totalVisitors > 0
                                        ? (analytics.overview.totalPageviews / analytics.overview.totalVisitors).toFixed(1)
                                        : 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Traffic Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <OverviewChart data={analytics.chartData} />
                        </CardContent>
                    </Card>

                    {/* Breakdowns */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <DataList title="Top Pages" data={analytics.topPages} />
                        <DataList title="Top Referrers" data={analytics.topReferrers} />
                        <DataList title="Devices" data={analytics.topDevices} />
                        <DataList title="Browsers" data={analytics.topBrowsers} />
                        <DataList title="OS" data={analytics.topOS} />
                        <DataList title="Countries" data={analytics.topCountries} />
                    </div>
                </>
            )}

        </div>
    );
}
