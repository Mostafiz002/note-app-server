import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FoldersPanel } from "@/components/features/sidebar/FoldersPanel";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <aside className="w-full lg:w-72 border-r bg-sidebar text-sidebar-foreground flex flex-col shrink-0 lg:h-full max-h-[35dvh] lg:max-h-full">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              Think Note AI
            </Link>
            <div className="flex items-center gap-1">
              <AnimatedThemeToggler className="cursor-pointer mx-2" />

              <form action="/api/auth/logout" method="post">
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="cursor-pointer border-white/10 bg-background/40 backdrop-blur transition-transform hover:scale-[1.02]"
                >
                  <LogOut className="mr-2 size-4" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
          <div className="flex-1 px-4 py-3 min-h-0 overflow-auto">
            <FoldersPanel />
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden min-h-0">{children}</main>
      </div>
    </div>
  );
}
