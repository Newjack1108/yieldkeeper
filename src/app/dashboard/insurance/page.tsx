import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { InsurancePageClient } from "./insurance-client";

export default async function InsurancePage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const policies = await db.insurancePolicy.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { renewalDate: "asc" },
  });

  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const policiesFormatted = policies.map((p) => ({
    id: p.id,
    propertyId: p.propertyId,
    property: p.property,
    provider: p.provider,
    policyNumber: p.policyNumber,
    premium: p.premium != null ? Number(p.premium) : null,
    renewalDate: p.renewalDate?.toISOString().slice(0, 10) ?? null,
    coverageNotes: p.coverageNotes,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insurance</h1>
        <p className="text-muted-foreground">
          Track insurance policies and renewal dates
        </p>
      </div>
      <InsurancePageClient
        initialPolicies={policiesFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
      />
    </div>
  );
}
