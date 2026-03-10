import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { MaintenancePageClient } from "./maintenance-client";

export default async function MaintenancePage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  if (propertyIds.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground">No properties assigned</p>
      </div>
    );
  }

  const maintenance = await db.maintenanceRequest.findMany({
    where: { propertyId: { in: propertyIds } },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { id: true, name: true } },
        },
      },
      contractor: { select: { id: true, name: true, tradeType: true } },
    },
    orderBy: { reportedDate: "desc" },
  });

  const properties = await db.property.findMany({
    where: { id: { in: propertyIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const tenancies = await db.tenancy.findMany({
    where: { propertyId: { in: propertyIds } },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const contractors = await db.contractor.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const maintenanceFormatted = maintenance.map((m) => ({
    id: m.id,
    propertyId: m.propertyId,
    property: m.property,
    tenancyId: m.tenancyId,
    tenancy: m.tenancy,
    contractorId: m.contractorId,
    contractor: m.contractor,
    title: m.title,
    description: m.description,
    priority: m.priority,
    status: m.status,
    estimatedCost: m.estimatedCost != null ? Number(m.estimatedCost) : null,
    actualCost: m.actualCost != null ? Number(m.actualCost) : null,
    quotedAmount: m.quotedAmount != null ? Number(m.quotedAmount) : null,
    paymentStatus: m.paymentStatus,
    tenantPaidAmount: m.tenantPaidAmount != null ? Number(m.tenantPaidAmount) : null,
    propertyMaintenanceTaskId: m.propertyMaintenanceTaskId,
    reportedDate: m.reportedDate.toISOString().slice(0, 10),
    completedDate: m.completedDate?.toISOString().slice(0, 10) ?? null,
    invoiceUrl: m.invoiceUrl,
  }));

  const tenanciesForSelect = tenancies.map((t) => ({
    id: t.id,
    propertyId: t.propertyId,
    label: `${t.property.address} — ${t.tenant.name}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground">
          Manage repair requests and contractors
        </p>
      </div>
      <MaintenancePageClient
        initialMaintenance={maintenanceFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
        tenancies={tenanciesForSelect}
        contractors={contractors.map((c) => ({
          id: c.id,
          name: c.name,
          tradeType: c.tradeType,
        }))}
      />
    </div>
  );
}
