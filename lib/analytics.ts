import { prisma } from "@/lib/db";
import { addDays, addHours, subDays, startOfDay, startOfHour, format } from "date-fns";

export type DateRange = { from: Date; to: Date };
export type Period = "24h" | "7d" | "30d" | "90d";

export function getPeriodDates(period: Period): { from: Date; to: Date; label: string } {
    const to = new Date();
    switch (period) {
        case "24h": return { from: subDays(to, 1), to, label: "Last 24 hours" };
        case "7d":  return { from: subDays(to, 7), to, label: "Last 7 days" };
        case "90d": return { from: subDays(to, 90), to, label: "Last 90 days" };
        default:    return { from: subDays(to, 30), to, label: "Last 30 days" };
    }
}

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

function fillChartHours(
    rawData: { date: string; views: number; visitors: number }[],
    from: Date,
    to: Date
): { date: string; views: number; visitors: number }[] {
    const dataMap = new Map(rawData.map(d => [d.date, d]));
    const result: { date: string; views: number; visitors: number }[] = [];
    let current = startOfHour(from);
    const end = startOfHour(to);
    while (current <= end) {
        const dateStr = format(current, "yyyy-MM-dd HH:00");
        result.push(dataMap.get(dateStr) || { date: dateStr, views: 0, visitors: 0 });
        current = addHours(current, 1);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Full analytics for the detail dashboard
// ---------------------------------------------------------------------------

export async function getAnalytics(websiteId: string, range: DateRange, period: Period = "30d") {
    const { from, to } = range;

    // Previous period for comparison
    const durationMs = to.getTime() - from.getTime();
    const prevTo = from;
    const prevFrom = new Date(from.getTime() - durationMs);

    // ── Current period aggregates ──────────────────────────────────────────

    const totalPageviews = await prisma.event.count({
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to } },
    });

    const uniqueVisitors = await prisma.event.groupBy({
        by: ["visitorHash"],
        where: { websiteId, createdAt: { gte: from, lte: to }, type: "pageview" },
        _count: true,
    });
    const totalVisitors = uniqueVisitors.length;

    const bounceRaw = await prisma.$queryRaw<[{ bounce_rate: number }]>`
        SELECT COALESCE(
            COUNT(CASE WHEN cnt = 1 THEN 1 END)::float / NULLIF(COUNT(*), 0)::float, 0
        ) AS bounce_rate
        FROM (
            SELECT "visitorHash", COUNT(*) AS cnt
            FROM "events"
            WHERE "websiteId" = ${websiteId}
              AND "createdAt" >= ${from} AND "createdAt" <= ${to}
              AND "type" = 'pageview'
            GROUP BY "visitorHash"
        ) sub
    `;
    const bounceRate = bounceRaw[0]?.bounce_rate ?? 0;

    // ── Previous period aggregates ─────────────────────────────────────────

    const prevPageviews = await prisma.event.count({
        where: { websiteId, type: "pageview", createdAt: { gte: prevFrom, lt: prevTo } },
    });

    const prevUniqueVisitors = await prisma.event.groupBy({
        by: ["visitorHash"],
        where: { websiteId, createdAt: { gte: prevFrom, lt: prevTo }, type: "pageview" },
        _count: true,
    });
    const prevVisitors = prevUniqueVisitors.length;

    const prevBounceRaw = await prisma.$queryRaw<[{ bounce_rate: number }]>`
        SELECT COALESCE(
            COUNT(CASE WHEN cnt = 1 THEN 1 END)::float / NULLIF(COUNT(*), 0)::float, 0
        ) AS bounce_rate
        FROM (
            SELECT "visitorHash", COUNT(*) AS cnt
            FROM "events"
            WHERE "websiteId" = ${websiteId}
              AND "createdAt" >= ${prevFrom} AND "createdAt" < ${prevTo}
              AND "type" = 'pageview'
            GROUP BY "visitorHash"
        ) sub
    `;
    const prevBounceRate = prevBounceRaw[0]?.bounce_rate ?? 0;

    // ── Chart data ─────────────────────────────────────────────────────────

    let chartData: { date: string; views: number; visitors: number }[];

    if (period === "24h") {
        const raw = await prisma.$queryRaw<{ date: string; views: number; visitors: number }[]>`
            SELECT
                to_char("createdAt", 'YYYY-MM-DD HH24:00') AS date,
                COUNT(*)::int AS views,
                COUNT(DISTINCT "visitorHash")::int AS visitors
            FROM "events"
            WHERE "websiteId" = ${websiteId}
              AND "createdAt" >= ${from} AND "createdAt" <= ${to}
              AND "type" = 'pageview'
            GROUP BY 1 ORDER BY 1 ASC
        `;
        chartData = fillChartHours(raw, from, to);
    } else {
        const raw = await prisma.$queryRaw<{ date: string; views: number; visitors: number }[]>`
            SELECT
                to_char("createdAt", 'YYYY-MM-DD') AS date,
                COUNT(*)::int AS views,
                COUNT(DISTINCT "visitorHash")::int AS visitors
            FROM "events"
            WHERE "websiteId" = ${websiteId}
              AND "createdAt" >= ${from} AND "createdAt" <= ${to}
              AND "type" = 'pageview'
            GROUP BY 1 ORDER BY 1 ASC
        `;
        chartData = fillChartDays(raw, from, to);
    }

    // ── Breakdowns ─────────────────────────────────────────────────────────

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

    // ── Custom events ──────────────────────────────────────────────────────

    const customEvents = await prisma.event.groupBy({
        by: ["eventName"],
        where: { websiteId, type: "custom", createdAt: { gte: from, lte: to }, eventName: { not: null } },
        _count: { eventName: true },
        orderBy: { _count: { eventName: "desc" } },
        take: 10,
    });

    // ── UTM sources & campaigns ────────────────────────────────────────────

    const utmSources = await prisma.event.groupBy({
        by: ["utmSource"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to }, utmSource: { not: null } },
        _count: { utmSource: true },
        orderBy: { _count: { utmSource: "desc" } },
        take: 10,
    });

    const utmCampaigns = await prisma.event.groupBy({
        by: ["utmCampaign"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to }, utmCampaign: { not: null } },
        _count: { utmCampaign: true },
        orderBy: { _count: { utmCampaign: "desc" } },
        take: 10,
    });

    // ── Helpers ────────────────────────────────────────────────────────────

    function delta(current: number, prev: number): number {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
    }

    return {
        overview: {
            totalPageviews,
            totalVisitors,
            bounceRate,
            viewsPerVisitor: totalVisitors > 0 ? totalPageviews / totalVisitors : 0,
            deltas: {
                pageviews: delta(totalPageviews, prevPageviews),
                visitors: delta(totalVisitors, prevVisitors),
                bounceRate: delta(bounceRate, prevBounceRate),
            },
        },
        chartData,
        topPages: topPages.map(p => ({ name: p.pathname, count: p._count.pathname })),
        topReferrers: topReferrers.map(r => ({ name: r.referrer || "Direct", count: r._count.referrer })),
        topCountries: topCountries.map(c => ({ name: c.country || "Unknown", count: c._count.country })),
        topDevices: topDevices.map(d => ({ name: d.device || "Unknown", count: d._count.device })),
        topBrowsers: topBrowsers.map(b => ({ name: b.browser || "Unknown", count: b._count.browser })),
        topOS: topOS.map(o => ({ name: o.os || "Unknown", count: o._count.os })),
        customEvents: customEvents.map(e => ({ name: e.eventName!, count: e._count.eventName })),
        utmSources: utmSources.map(u => ({ name: u.utmSource!, count: u._count.utmSource })),
        utmCampaigns: utmCampaigns.map(u => ({ name: u.utmCampaign!, count: u._count.utmCampaign })),
    };
}

// ---------------------------------------------------------------------------
// Live visitors (last 5 minutes)
// ---------------------------------------------------------------------------

export async function getLiveVisitors(websiteId: string): Promise<number> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT "visitorHash")::int AS count
        FROM "events"
        WHERE "websiteId" = ${websiteId}
          AND "createdAt" >= ${fiveMinAgo}
          AND "type" = 'pageview'
    `;
    return result[0]?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Website overview cards (summary for all sites)
// ---------------------------------------------------------------------------

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
        const d = previousViews > 0 ? ((currentViews - previousViews) / previousViews) * 100 : (currentViews > 0 ? 100 : 0);
        const rawChart = chartMap.get(website.id) || [];
        const chartData = fillChartDays(rawChart.map(r => ({ ...r, visitors: 0 })), sevenDaysAgo, now);

        return { id: website.id, domain: website.domain, createdAt: website.createdAt, currentViews, currentVisitors, previousViews, delta: d, chartData };
    });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export async function getUserWebsites(userId: string) {
    return prisma.website.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
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
    return prisma.website.create({ data: { ownerId: userId, domain } });
}
