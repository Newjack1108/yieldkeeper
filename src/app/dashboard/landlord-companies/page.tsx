import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { LandlordCompaniesPageClient } from "./landlord-companies-client";

export default async function LandlordCompaniesPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  if (user.role === "estate_agent") {
    redirect("/dashboard");
  }

  const companies = await db.landlordCompany.findMany({
    where: { userId: user.id },
    include: { _count: { select: { properties: true } } },
    orderBy: { name: "asc" },
  });

  const companiesWithCount = companies.map((c) => ({
    id: c.id,
    name: c.name,
    registrationNumber: c.registrationNumber,
    address: c.address,
    propertyCount: c._count.properties,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Landlord Companies
        </h1>
        <p className="text-muted-foreground">
          Manage limited companies that own rental properties
        </p>
      </div>
      <LandlordCompaniesPageClient initialCompanies={companiesWithCount} />
    </div>
  );
}
