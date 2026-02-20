import { prisma } from "@/lib/db";
import { startOfDay, subDays, endOfDay, format } from "date-fns";

export type DateRange = {
    from: Date;
    to: Date;
};

export async function getAnalytics(websiteId: string, range: DateRange) {
    const { from, to } = range;

    // 1. Visitors & PageViews (Aggregate)
    const totalPageviews = await prisma.event.count({
        where: {
            websiteId,
            type: "pageview",
            createdAt: { gte: from, lte: to },
        },
    });

    // Unique Visitors (Approximate by counting distinct visitorHash)
    // Prisma doesn't support count(distinct) well on all providers easily without groupBy
    // but we can use groupBy
    const uniqueVisitorsFn = await prisma.event.groupBy({
        by: ["visitorHash"],
        where: {
            websiteId,
            createdAt: { gte: from, lte: to },
        },
        _count: true,
    });
    const totalVisitors = uniqueVisitorsFn.length;

    // 2. Chart Data (Time series)
    // Group by day.
    // We can query raw and aggregate in JS or use raw SQL.
    // For "Lite" and simple implementation, let's fetch minimal fields and aggregate in JS 
    // OR use prisma groupBy createdAt. 
    // Prisma groupBy date truncation is tricky without raw query.
    // Let's us Raw Query for efficiency if using Postgres.
    // "SELECT date_trunc('day', createdAt) as date, count(*) as views, count(distinct visitorHash) as visitors FROM ..."

    // Since we are using Prisma + Neon (Postgres), we can use queryRaw.
    const chartDataRaw = await prisma.$queryRaw`
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

    // 3. Top Pages
    const topPages = await prisma.event.groupBy({
        by: ["pathname"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to } },
        _count: { pathname: true },
        orderBy: { _count: { pathname: "desc" } },
        take: 10,
    });

    // 4. Top Referrers
    const topReferrers = await prisma.event.groupBy({
        by: ["referrer"],
        where: { websiteId, type: "pageview", createdAt: { gte: from, lte: to }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
    });

    // 5. Countries
    const topCountries = await prisma.event.groupBy({
        by: ["country"],
        where: { websiteId, createdAt: { gte: from, lte: to }, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
    });

    // 6. Devices
    const topDevices = await prisma.event.groupBy({
        by: ["device"],
        where: { websiteId, createdAt: { gte: from, lte: to }, device: { not: null } },
        _count: { device: true },
        orderBy: { _count: { device: "desc" } },
        take: 5,
    });

    // 7. Browsers
    const topBrowsers = await prisma.event.groupBy({
        by: ["browser"],
        where: { websiteId, createdAt: { gte: from, lte: to }, browser: { not: null } },
        _count: { browser: true },
        orderBy: { _count: { browser: "desc" } },
        take: 5,
    });

    // 8. OS
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
        chartData: chartDataRaw as { date: string, views: number, visitors: number }[],
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
