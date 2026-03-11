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
  const propertyIds = tenant.tenancies.map((t) => t.propertyId);

  const [maintenance, availableTasks] = await Promise.all([
    db.maintenanceRequest.findMany({
      where: { tenancyId: { in: tenancyIds } },
      include: {
        property: { select: { address: true } },
        propertyMaintenanceTask: {
          select: { id: true, taskType: true, name: true, price: true },
        },
        documents: {
          where: { type: "fault_photo" },
          select: { url: true },
        },
      },
      orderBy: { reportedDate: "desc" },
    }),
    db.propertyMaintenanceTask.findMany({
      where: { propertyId: { in: propertyIds }, enabled: true },
      orderBy: { taskType: "asc" },
    }),
  ]);

  const tenancies = tenant.tenancies.map((t) => ({
    id: t.id,
    address: t.property.address,
    propertyId: t.propertyId,
  }));

  const tasksByProperty = tenancies.map((t) => ({
    tenancyId: t.id,
    propertyAddress: t.address,
    tasks: availableTasks
      .filter((task) => task.propertyId === t.propertyId)
      .map((task) => ({
        id: task.id,
        taskType: task.taskType,
        name: task.name,
        price: Number(task.price),
      })),
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
    quotedAmount: m.quotedAmount != null ? Number(m.quotedAmount) : null,
    paymentStatus: m.paymentStatus,
    tenantPaidAmount: m.tenantPaidAmount != null ? Number(m.tenantPaidAmount) : null,
    estimatedCost: m.estimatedCost != null ? Number(m.estimatedCost) : null,
    propertyMaintenanceTaskId: m.propertyMaintenanceTaskId,
    taskName: m.propertyMaintenanceTask?.name,
    photoCount: m.documents.length,
    firstPhotoUrl: m.documents[0]?.url ?? null,
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
        availableTasks={tasksByProperty}
      />
    </div>
  );
}
