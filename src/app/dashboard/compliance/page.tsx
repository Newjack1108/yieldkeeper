import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompliancePageClient } from "./compliance-client";

export default async function CompliancePage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: { properties: { select: { id: true, address: true } } },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const compliance = await db.complianceRecord.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const complianceFormatted = compliance.map((c) => ({
    id: c.id,
    propertyId: c.propertyId,
    property: c.property,
    type: c.type,
    issueDate: c.issueDate?.toISOString().slice(0, 10) ?? null,
    expiryDate: c.expiryDate.toISOString().slice(0, 10),
    certificateNumber: c.certificateNumber,
    documentUrl: c.documentUrl,
    notes: c.notes,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground">
          Track certificates and expiry dates
        </p>
      </div>
      <CompliancePageClient
        initialCompliance={complianceFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
      />
    </div>
  );
}
