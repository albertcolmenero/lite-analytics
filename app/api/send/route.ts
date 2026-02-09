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
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
    event_name: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
});

function getVisitorHash(ip: string, userAgent: string, websiteId: string) {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const salt = process.env.CLERK_SECRET_KEY || "fallback_salt"; // Use a secret salt
    const input = `${ip}-${userAgent}-${websiteId}-${date}-${salt}`;
    return crypto.createHash("sha256").update(input).digest("hex");
}

// Normalize domain by stripping www. prefix
function normalizeDomain(hostname: string): string {
    return hostname.replace(/^www\./, '');
}

// CORS headers for cross-origin tracking
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight OPTIONS requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Validate Body
        const body = await req.json();
        const payload = eventSchema.parse(body);

        // 2. Validate Origin / Website
        const origin = req.headers.get("origin") || req.headers.get("referer");
        if (!origin) {
            return NextResponse.json({ error: "Missing Origin" }, { status: 400, headers: corsHeaders });
        }

        let domain: string;
        try {
            const originUrl = new URL(origin);
            // Normalize domain by stripping www. prefix for matching
            domain = normalizeDomain(originUrl.hostname);
        } catch {
            return NextResponse.json({ error: "Invalid Origin" }, { status: 400, headers: corsHeaders });
        }

        // Find website by domain (normalized)
        const website = await prisma.website.findUnique({
            where: { domain },
        });

        if (!website) {
            console.log(`Website not found for domain: ${domain}`);
            return NextResponse.json({ error: "Website not registered", domain }, { status: 404, headers: corsHeaders });
        }

        // 3. Compute Metadata
        const headerStore = await headers();
        const ip = headerStore.get("x-forwarded-for") || "127.0.0.1";
        const userAgent = headerStore.get("user-agent") || "unknown";
        const country = headerStore.get("x-vercel-ip-country") || null;

        // User Agent Parsing
        const parser = new UAParser(userAgent);
        const browserName = parser.getBrowser().name;
        const osName = parser.getOS().name;
        const deviceType = parser.getDevice().type || "desktop"; // Default to desktop if undefined

        // Visitor Hash
        const visitorHash = getVisitorHash(ip, userAgent, website.id);

        // 4. Insert Event
        await prisma.event.create({
            data: {
                websiteId: website.id,
                type: payload.type,
                visitorHash,
                pathname: payload.pathname,
                hostname: payload.hostname || domain,
                referrer: payload.referrer,
                country: country,

                browser: browserName || "Unknown",
                os: osName || "Unknown",
                device: deviceType,

                // UTMs
                utmSource: payload.utm_source,
                utmMedium: payload.utm_medium,
                utmCampaign: payload.utm_campaign,
                utmTerm: payload.utm_term,
                utmContent: payload.utm_content,

                // Custom
                eventName: payload.event_name,
                properties: payload.properties ?? undefined,
            },
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders });

    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}
