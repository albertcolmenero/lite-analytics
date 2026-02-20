import { prisma } from "@/lib/db";
import { addDays, subDays, startOfDay, format } from "date-fns";

export type DateRange = {
    from: Date;
    to: Date;
};

function fillChartDays(
    rawData: { date: string; views: number; visitors: number }[],
    from: Date,
    to: Date
): { date: string; views: number; visitors: number }[] {
    const dataMap = new Map(rawData.map(d => [d.date, d]));
    const result: { date: string; views: number; visitors: number }[] = [];

    let current = startOfDay(from);
    const end = startOfDay(to);

    while (current <= end) {
        const dateStr = format(current, "yyyy-MM-dd");
        result.push(dataMap.get(dateStr) || { date: dateStr, views: 0, visitors: 0 });
        current = addDays(current, 1);
    }

    return result;
}

export async function getWebsitesSummary(userId: string) {
    const websites = await getUserWebsites(userId);
    if (websites.length === 0) return [];

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);

    const websiteIds = websites.map(w => w.id);

    type SummaryRow = { websiteId: string; currentViews: number; previousViews: number; currentVisitors: number };

    const summaryRows = await prisma.$queryRaw<SummaryRow[]>`
        SELECT
            e."websiteId",
            COALESCE(SUM(CASE WHEN e."createdAt" >= ${sevenDaysAgo} THEN 1 ELSE 0 END), 0)::int AS "currentViews",
            COALESCE(SUM(CASE WHEN e."createdAt" < ${sevenDaysAgo} THEN 1 ELSE 0 END), 0)::int AS "previousViews",
            COALESCE(COUNT(DISTINCT CASE WHEN e."createdAt" >= ${sevenDaysAgo} THEN e."visitorHash" END), 0)::int AS "currentVisitors"
        FROM "events" e
        WHERE e."websiteId" = ANY(${websiteIds})
          AND e."createdAt" >= ${fourteenDaysAgo}
          AND e."type" = 'pageview'
        GROUP BY e."websiteId"
    `;

    type ChartRow = { websiteId: string; date: string; views: number };

    const chartRows = await prisma.$queryRaw<ChartRow[]>`
        SELECT
            e."websiteId",
            to_char(e."createdAt", 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS views
        FROM "events" e
        WHERE e."websiteId" = ANY(${websiteIds})
          AND e."createdAt" >= ${sevenDaysAgo}
          AND e."type" = 'pageview'
        GROUP BY e."websiteId", to_char(e."createdAt", 'YYYY-MM-DD')
    `;

    const summaryMap = new Map(summaryRows.map(r => [r.websiteId, r]));
    const chartMap = new Map<string, { date: string; views: number }[]>();
    for (const row of chartRows) {
        if (!chartMap.has(row.websiteId)) chartMap.set(row.websiteId, []);
        chartMap.get(row.websiteId)!.push({ date: row.date, views: row.views });
    }

    return websites.map(website => {
        const summary = summaryMap.get(website.id);
        const currentViews = summary?.currentViews ?? 0;
        const previousViews = summary?.previousViews ?? 0;
        const currentVisitors = summary?.currentVisitors ?? 0;

        const delta = previousViews > 0
            ? ((currentViews - previousViews) / previousViews) * 100
            : (currentViews > 0 ? 100 : 0);

        const rawChart = chartMap.get(website.id) || [];
        const chartData = fillChartDays(
            rawChart.map(r => ({ ...r, visitors: 0 })),
            sevenDaysAgo,
            now,
        );

        return {
            id: website.id,
            domain: website.domain,
            createdAt: website.createdAt,
            currentViews,
            currentVisitors,
            previousViews,
            delta,
            chartData,
        };
    });
}

export async function getAnalytics(websiteId: string, range: DateRange) {
    const { from, to } = range;

    const totalPageviews = await prisma.event.count({
        where: {
            websiteId,
            type: "pageview",
            createdAt: { gte: from, lte: to },
        },
    });

    const uniqueVisitorsFn = await prisma.event.groupBy({
        by: ["visitorHash"],
        where: {
            websiteId,
            createdAt: { gte: from, lte: to },
        },
        _count: true,
    });
    const totalVisitors = uniqueVisitorsFn.length;

    const chartDataRaw = await prisma.$queryRaw<{ date: string; views: number; visitors: number }[]>`
        SELECT
            to_char("createdAt", 'YYYY-MM-DD') as date,
            COUNT(*)::int as views,
            COUNT(DISTINCT "visitorHash")::int as visitors
        FROM "events"
        WHERE "websiteId" = ${websiteId}
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
          AND "type" = 'pageview'
        GROUP BY 1
        ORDER BY 1 ASC
    `;

    const chartData = fillChartDays(chartDataRaw, from, to);

    const topPages = await prisma.event.groupBy({
        by: ["pathname"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to } },
        _count: { pathname: true },
        orderBy: { _count: { pathname: "desc" } },
        take: 10,
    });

    const topReferrers = await prisma.event.groupBy({
        by: ["referrer"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
    });

    const topCountries = await prisma.event.groupBy({
        by: ["country"],
        where: { websiteId, createdAt: { gte: from, lte: to }, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
    });

    const topDevices = await prisma.event.groupBy({
        by: ["device"],
        where: { websiteId, createdAt: { gte: from, lte: to }, device: { not: null } },
        _count: { device: true },
        orderBy: { _count: { device: "desc" } },
        take: 5,
    });

    const topBrowsers = await prisma.event.groupBy({
        by: ["browser"],
        where: { websiteId, createdAt: { gte: from, lte: to }, browser: { not: null } },
        _count: { browser: true },
        orderBy: { _count: { browser: "desc" } },
        take: 5,
    });

    const topOS = await prisma.event.groupBy({
        by: ["os"],
        where: { websiteId, createdAt: { gte: from, lte: to }, os: { not: null } },
        _count: { os: true },
        orderBy: { _count: { os: "desc" } },
        take: 5,
    });

    return {
        overview: {
            totalPageviews,
            totalVisitors,
        },
        chartData,
        topPages: topPages.map(p => ({ name: p.pathname, count: p._count.pathname })),
        topReferrers: topReferrers.map(r => ({ name: r.referrer || "Direct", count: r._count.referrer })),
        topCountries: topCountries.map(c => ({ name: c.country || "Unknown", count: c._count.country })),
        topDevices: topDevices.map(d => ({ name: d.device || "Unknown", count: d._count.device })),
        topBrowsers: topBrowsers.map(b => ({ name: b.browser || "Unknown", count: b._count.browser })),
        topOS: topOS.map(o => ({ name: o.os || "Unknown", count: o._count.os })),
    };
}

export async function getUserWebsites(userId: string) {
    return await prisma.website.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" }
    });
}

export async function createWebsite(userId: string, rawDomain: string) {
    let domain = rawDomain.trim().toLowerCase();
    try {
        if (domain.includes("://") || domain.includes("/")) {
            const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
            domain = url.hostname;
        }
    } catch { /* use as-is */ }
    domain = domain.replace(/^www\./, "").replace(/\/$/, "");

    return await prisma.website.create({
        data: {
            ownerId: userId,
            domain,
        }
    })
}
