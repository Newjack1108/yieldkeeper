"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
  "/tenant": "Dashboard",
  "/tenant/communications": "Communications",
  "/tenant/documents": "Documents",
  "/tenant/maintenance": "Maintenance",
};

function getPageTitle(pathname: string): string {
  return ROUTE_TITLES[pathname] ?? "YieldKeeper";
}

export function TenantMobileHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 min-h-[44px] shrink-0 items-center gap-2 border-b border-sidebar-border bg-background px-4 md:hidden"
      )}
    >
      <SidebarTrigger
        className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0"
        aria-label="Open menu"
      />
      <h1 className="truncate text-lg font-semibold">{title}</h1>
    </header>
  );
}
