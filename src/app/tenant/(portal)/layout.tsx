import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/layout/tenant-sidebar";
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
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
