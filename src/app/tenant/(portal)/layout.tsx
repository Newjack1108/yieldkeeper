import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/layout/tenant-sidebar";
import { TenantMobileHeader } from "@/components/layout/tenant-mobile-header";
import { validateRequest } from "@/lib/auth";

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.role !== "tenant") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <TenantSidebar user={user} />
      <SidebarInset>
        <TenantMobileHeader />
        <main className="tenant-portal flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
