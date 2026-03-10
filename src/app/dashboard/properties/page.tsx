import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { PropertiesPageClient } from "./properties-client";

export default async function PropertiesPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  let portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  if (portfolios.length === 0) {
    const created = await db.portfolio.create({
      data: { name: "Main Portfolio", userId: user.id },
    });
    portfolios = [created];
  }
  const propertiesRaw = await db.property.findMany({
    where: { portfolio: { userId: user.id } },
    include: { portfolio: { select: { name: true } } },
    orderBy: { address: "asc" },
  });

  const properties = propertiesRaw.map((p) => ({
    id: p.id,
    address: p.address,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : null,
    currentValue: p.currentValue ? Number(p.currentValue) : null,
    occupancyStatus: p.occupancyStatus,
    notes: p.notes,
    portfolio: p.portfolio,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          Manage your property portfolio
        </p>
      </div>
      <PropertiesPageClient
        initialProperties={properties}
        portfolios={portfolios}
      />
    </div>
  );
}
