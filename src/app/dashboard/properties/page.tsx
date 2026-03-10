import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAgentPropertyIds } from "@/lib/estate-agent";
import { PropertiesPageClient } from "./properties-client";

export default async function PropertiesPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  let portfolios: { id: string; name: string }[] = [];
  let propertiesRaw: Array<{
    id: string;
    address: string;
    propertyType: string | null;
    bedrooms: number | null;
    purchasePrice: unknown;
    currentValue: unknown;
    occupancyStatus: string | null;
    notes: string | null;
    portfolioId: string;
    estateAgentId: string | null;
    ownershipType: string;
    landlordCompanyId: string | null;
    portfolio: { id: string; name: string };
    estateAgent: { id: string; name: string } | null;
    landlordCompany: { id: string; name: string } | null;
  }> = [];

  if (user.role === "estate_agent") {
    const propertyIds = await getAgentPropertyIds(user.id);
    if (propertyIds.length > 0) {
      propertiesRaw = await db.property.findMany({
        where: { id: { in: propertyIds } },
        include: {
          portfolio: { select: { id: true, name: true } },
          estateAgent: { select: { id: true, name: true } },
          landlordCompany: { select: { id: true, name: true } },
        },
        orderBy: { address: "asc" },
      });
      const portfolioIds = [...new Set(propertiesRaw.map((p) => p.portfolio.id))];
      const portfs = await db.portfolio.findMany({
        where: { id: { in: portfolioIds } },
        select: { id: true, name: true },
      });
      portfolios = portfs;
    }
  } else {
    portfolios = await db.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    if (portfolios.length === 0) {
      const created = await db.portfolio.create({
        data: { name: "Main Portfolio", userId: user.id },
        select: { id: true, name: true },
      });
      portfolios = [created];
    }
    propertiesRaw = await db.property.findMany({
      where: { portfolio: { userId: user.id } },
      include: {
        portfolio: { select: { id: true, name: true } },
        estateAgent: { select: { id: true, name: true } },
        landlordCompany: { select: { id: true, name: true } },
      },
      orderBy: { address: "asc" },
    });
  }

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
    estateAgentId: p.estateAgentId,
    estateAgent: p.estateAgent,
    ownershipType: p.ownershipType ?? "sole",
    landlordCompanyId: p.landlordCompanyId,
    landlordCompany: p.landlordCompany,
  }));

  const estateAgents =
    user.role === "portfolio_owner" || user.role === "admin"
      ? await db.estateAgent.findMany({
          where: { createdByUserId: user.id },
          select: { id: true, name: true, company: true },
        })
      : [];

  const landlordCompanies =
    user.role === "portfolio_owner" || user.role === "admin"
      ? await db.landlordCompany.findMany({
          where: { userId: user.id },
          select: { id: true, name: true, registrationNumber: true },
          orderBy: { name: "asc" },
        })
      : [];

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
        estateAgents={estateAgents}
        landlordCompanies={landlordCompanies}
        userRole={user.role}
      />
    </div>
  );
}
