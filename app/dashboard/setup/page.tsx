import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { env } from "@/lib/env";

export default async function SetupPage(props: { searchParams: Promise<{ websiteId?: string }> }) {
    const searchParams = await props.searchParams;
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    if (!searchParams.websiteId) {
        redirect("/dashboard");
    }

    const website = await prisma.website.findUnique({
        where: { id: searchParams.websiteId, ownerId: userId }
    });

    if (!website) {
        return <div>Website not found</div>;
    }

    const scriptTag = `<script defer src="${env.NEXT_PUBLIC_APP_URL}/tracker.js" data-website-id="${website.id}"></script>`;

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back to Dashboard</Link>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Setup Instructions</h1>
                <p className="text-muted-foreground">For {website.domain}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Add the Script</CardTitle>
                    <CardDescription>Copy and paste this snippet into the <code>&lt;head&gt;</code> or <code>&lt;body&gt;</code> of your website.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-950 p-4 rounded-md overflow-x-auto relative group">
                        <code className="text-sm text-white whitespace-pre-wrap">{scriptTag}</code>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Verify Installation</CardTitle>
                    <CardDescription>Visit your website, then check the dashboard to see if your visit was recorded.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/dashboard">View Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
