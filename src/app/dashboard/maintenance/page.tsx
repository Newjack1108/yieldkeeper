import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { MaintenancePageClient } from "./maintenance-client";

export default async function MaintenancePage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: { properties: { select: { id: true, address: true } } },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const maintenance = await db.maintenanceRequest.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
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
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const tenancies = await db.tenancy.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
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
