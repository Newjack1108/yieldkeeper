import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { MaintenanceClient } from "./maintenance-client";

export default async function TenantMaintenancePage() {
  const { user } = await validateRequest();
  if (!user || user.role !== "tenant") return null;

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) return null;

  const tenancyIds = tenant.tenancies.map((t) => t.id);

  const maintenance = await db.maintenanceRequest.findMany({
    where: { tenancyId: { in: tenancyIds } },
    include: {
      property: { select: { address: true } },
    },
    orderBy: { reportedDate: "desc" },
  });

  const tenancies = tenant.tenancies.map((t) => ({
    id: t.id,
    address: t.property.address,
  }));

  const maintenanceList = maintenance.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    priority: m.priority,
    status: m.status,
    reportedDate: m.reportedDate.toISOString(),
    completedDate: m.completedDate?.toISOString() ?? null,
    propertyAddress: m.property?.address ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground">
          Request repairs or view the status of maintenance jobs
        </p>
      </div>
      <MaintenanceClient
        tenancies={tenancies}
        maintenance={maintenanceList}
      />
    </div>
  );
}
