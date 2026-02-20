import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";

const eventSchema = z.object({
    type: z.enum(["pageview", "custom"]),
    pathname: z.string(),
    hostname: z.string().optional(),
    referrer: z.string().optional(),
    screen_width: z.number().optional(),
    language: z.string().optional(),
    website_id: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
    event_name: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
});

function getVisitorHash(ip: string, userAgent: string, websiteId: string) {
    const date = new Date().toISOString().split("T")[0];
    const salt = process.env.CLERK_SECRET_KEY || "fallback_salt";
    const input = `${ip}-${userAgent}-${websiteId}-${date}-${salt}`;
    return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeDomain(hostname: string): string {
    return hostname
        .toLowerCase()
        .replace(/^www\./, "")
        .replace(/\/$/, "");
}

function extractDomain(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed.includes("://") || trimmed.includes("/")) {
        try {
            const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
            return normalizeDomain(url.hostname);
        } catch {
            return null;
        }
    }
    return normalizeDomain(trimmed);
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        // Parse body — supports both application/json and text/plain (used by sendBeacon
        // to avoid CORS preflight on cross-origin requests)
        const rawText = await req.text();
        let body: unknown;
        try {
            body = JSON.parse(rawText);
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
        }

        const payload = eventSchema.parse(body);

        // Normalize empty referrer to undefined
        const referrer = payload.referrer && payload.referrer.trim() !== "" ? payload.referrer : undefined;

        // Resolve website: try website_id first, then fall back to Origin domain matching
        let website = null;

        if (payload.website_id) {
            website = await prisma.website.findUnique({
                where: { id: payload.website_id },
            });
        }

        if (!website) {
            const origin = req.headers.get("origin") || req.headers.get("referer");
            if (!origin) {
                return NextResponse.json(
                    { error: "Missing Origin — provide data-website-id on the script tag or ensure Origin header is sent" },
                    { status: 400, headers: corsHeaders }
                );
            }

            let domain: string;
            try {
                const originUrl = new URL(origin);
                domain = normalizeDomain(originUrl.hostname);
            } catch {
                return NextResponse.json({ error: "Invalid Origin" }, { status: 400, headers: corsHeaders });
            }

            website = await prisma.website.findUnique({
                where: { domain },
            });

            if (!website) {
                console.log(`[lite-analytics] Website not found for domain: "${domain}". Registered domains should match exactly (without protocol/www).`);
                return NextResponse.json({ error: "Website not registered", domain }, { status: 404, headers: corsHeaders });
            }
        }

        const headerStore = await headers();
        const ip = headerStore.get("x-forwarded-for") || "127.0.0.1";
        const userAgent = headerStore.get("user-agent") || "unknown";
        const country = headerStore.get("x-vercel-ip-country") || null;

        const parser = new UAParser(userAgent);
        const browserName = parser.getBrowser().name;
        const osName = parser.getOS().name;
        const deviceType = parser.getDevice().type || "desktop";

        const visitorHash = getVisitorHash(ip, userAgent, website.id);

        await prisma.event.create({
            data: {
                websiteId: website.id,
                type: payload.type,
                visitorHash,
                pathname: payload.pathname,
                hostname: payload.hostname || normalizeDomain(website.domain),
                referrer: referrer,
                country: country,

                browser: browserName || "Unknown",
                os: osName || "Unknown",
                device: deviceType,

                utmSource: payload.utm_source,
                utmMedium: payload.utm_medium,
                utmCampaign: payload.utm_campaign,
                utmTerm: payload.utm_term,
                utmContent: payload.utm_content,

                eventName: payload.event_name,
                properties: payload.properties ?? undefined,
            },
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders });

    } catch (error) {
        console.error("[lite-analytics] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}
