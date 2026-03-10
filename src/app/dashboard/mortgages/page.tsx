import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { MortgagesPageClient } from "./mortgages-client";

export default async function MortgagesPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);

  const mortgages = await db.mortgage.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { nextPaymentDate: "asc" },
  });

  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const mortgagesFormatted = mortgages.map((m) => ({
    id: m.id,
    propertyId: m.propertyId,
    property: m.property,
    lender: m.lender,
    interestRate: m.interestRate != null ? Number(m.interestRate) : null,
    loanBalance: m.loanBalance != null ? Number(m.loanBalance) : null,
    paymentAmount: m.paymentAmount != null ? Number(m.paymentAmount) : null,
    paymentFrequency: m.paymentFrequency,
    nextPaymentDate: m.nextPaymentDate?.toISOString().slice(0, 10) ?? null,
    fixedRateEndDate: m.fixedRateEndDate?.toISOString().slice(0, 10) ?? null,
    termEndDate: m.termEndDate?.toISOString().slice(0, 10) ?? null,
    notes: m.notes,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mortgages</h1>
        <p className="text-muted-foreground">
          Track mortgage payments and loan details
        </p>
      </div>
      <MortgagesPageClient
        initialMortgages={mortgagesFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
      />
    </div>
  );
}
