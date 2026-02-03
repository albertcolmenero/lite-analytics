import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Lite Analytics</h1>
          <p className="text-xl text-muted-foreground">
            Simple, privacy-friendly web analytics for your SaaS.
            No cookies, just insights.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Privacy First</h3>
            <p className="text-sm text-muted-foreground">No cookies. Helper hashes ensuring visitor privacy and GDPR compliance.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Lightweight</h3>
            <p className="text-sm text-muted-foreground">Tiny script size (less than 2kb) that won't slow down your website.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Real-time</h3>
            <p className="text-sm text-muted-foreground">See your traffic as it happens with instant data ingestion.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
