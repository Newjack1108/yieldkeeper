import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncOverdueSchedules } from "@/lib/rent";
import { RentPageClient } from "./rent-client";

export default async function RentPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  await syncOverdueSchedules(user.id);

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: { properties: { select: { id: true, address: true } } },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const tenancies = await db.tenancy.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true, email: true } },
      unit: { select: { id: true, unitLabel: true } },
      rentSchedules: {
        where: { status: { in: ["pending", "overdue"] } },
        orderBy: { dueDate: "asc" },
        take: 6,
      },
    },
    orderBy: { startDate: "desc" },
  });

  const overdueAgg = await db.rentSchedule.groupBy({
    by: ["tenancyId"],
    where: {
      status: "overdue",
      tenancy: { property: { portfolioId: { in: portfolioIds } } },
    },
    _sum: { amountDue: true },
  });
  const arrearsByTenancy = new Map(
    overdueAgg.map((a) => [a.tenancyId, Number(a._sum.amountDue ?? 0)])
  );

  const tenanciesWithArrears = tenancies.map((t) => {
    const rentAmount = Number(t.rentAmount);
    const arrears = arrearsByTenancy.get(t.id) ?? 0;
    const nextSchedule = t.rentSchedules.find(
      (s) => s.status === "pending" || s.status === "overdue"
    );
    return {
      id: t.id,
      propertyAddress: t.property.address,
      tenantName: t.tenant.name,
      rentAmount,
      rentFrequency: t.rentFrequency,
      status: t.status,
      arrears,
      nextDueDate: nextSchedule?.dueDate
        ? nextSchedule.dueDate.toISOString().slice(0, 10)
        : null,
      nextDueStatus: nextSchedule?.status ?? null,
      schedules: t.rentSchedules.map((s) => ({
        id: s.id,
        dueDate: s.dueDate.toISOString().slice(0, 10),
        amountDue: Number(s.amountDue),
        status: s.status,
      })),
    };
  });

  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const tenants = await db.tenant.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rent Tracking</h1>
        <p className="text-muted-foreground">
          Track rent schedules and record payments
        </p>
      </div>
      <RentPageClient
        initialTenancies={tenanciesWithArrears}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
        tenants={tenants}
      />
    </div>
  );
}
