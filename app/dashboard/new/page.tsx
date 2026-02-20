import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWebsite } from "@/lib/analytics"; // We will need to move this to a server action to be used in form
import { revalidatePath } from "next/cache";

async function createWebsiteAction(formData: FormData) {
    "use server";
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const rawDomain = (formData.get("domain") as string || "").trim();

    if (!rawDomain) return;

    // Normalize: strip protocol, www prefix, trailing slash, lowercase
    let domain = rawDomain.toLowerCase();
    try {
        if (domain.includes("://") || domain.includes("/")) {
            const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
            domain = url.hostname;
        }
    } catch { /* use as-is if URL parsing fails */ }
    domain = domain.replace(/^www\./, "").replace(/\/$/, "");

    if (!domain) return;

    const newSite = await prisma.website.create({
        data: {
            ownerId: userId,
            domain: domain,
        }
    });

    redirect(`/dashboard/setup?websiteId=${newSite.id}`);
}

export default async function NewWebsitePage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Add New Website</CardTitle>
                    <CardDescription>Enter the domain name of the site you want to track.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createWebsiteAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input id="domain" name="domain" placeholder="example.com" required />
                        </div>
                        <Button type="submit" className="w-full">Create Website</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
