import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <BarChart3 className="size-5 text-primary" />
                        <span>Lite Analytics</span>
                    </Link>
                    <UserButton />
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-8">
                {children}
            </main>
        </div>
    );
}
