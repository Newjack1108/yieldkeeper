import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { InspectionsPageClient } from "./inspections-client";

export default async function InspectionsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: { properties: { select: { id: true, address: true } } },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const inspections = await db.inspection.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { id: true, name: true } },
        },
      },
      items: true,
      actions: true,
    },
    orderBy: { scheduledDate: "desc" },
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

  const inspectionsFormatted = inspections.map((i) => ({
    id: i.id,
    propertyId: i.propertyId,
    property: i.property,
    tenancyId: i.tenancyId,
    tenancy: i.tenancy,
    type: i.type,
    scheduledDate: i.scheduledDate?.toISOString().slice(0, 10) ?? null,
    completedDate: i.completedDate?.toISOString().slice(0, 10) ?? null,
    inspector: i.inspector,
    nextDueDate: i.nextDueDate?.toISOString().slice(0, 10) ?? null,
    overallRating: i.overallRating,
    status: i.status ?? "scheduled",
    items: i.items.map((item) => ({
      id: item.id,
      roomName: item.roomName,
      conditionRating: item.conditionRating,
      notes: item.notes,
    })),
    actions: i.actions.map((a) => ({
      id: a.id,
      description: a.description,
      dueDate: a.dueDate?.toISOString().slice(0, 10) ?? null,
      completedDate: a.completedDate?.toISOString().slice(0, 10) ?? null,
      status: a.status ?? "pending",
    })),
  }));

  const tenanciesForSelect = tenancies.map((t) => ({
    id: t.id,
    propertyId: t.propertyId,
    label: `${t.property.address} — ${t.tenant.name}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
        <p className="text-muted-foreground">
          Log and track property inspections
        </p>
      </div>
      <InspectionsPageClient
        initialInspections={inspectionsFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
        tenancies={tenanciesForSelect}
      />
    </div>
  );
}
