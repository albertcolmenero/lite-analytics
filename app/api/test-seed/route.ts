import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Seed a test website for localhost development
export async function POST(req: NextRequest) {
    try {
        // Check if localhost website already exists
        const existing = await prisma.website.findUnique({
            where: { domain: "localhost" },
        });

        if (existing) {
            return NextResponse.json({
                message: "Localhost website already exists",
                website: existing
            });
        }

        // Create localhost website for testing
        const website = await prisma.website.create({
            data: {
                domain: "localhost",
                ownerId: "test-user", // Dummy owner for testing
            },
        });

        return NextResponse.json({
            message: "Created localhost test website",
            website
        });
    } catch (error) {
        console.error("Seed Error:", error);
        return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
    }
}

// Get all registered websites for debugging
export async function GET() {
    try {
        const websites = await prisma.website.findMany({
            include: {
                _count: {
                    select: { events: true }
                }
            }
        });
        return NextResponse.json({ websites });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Failed to fetch websites" }, { status: 500 });
    }
}
