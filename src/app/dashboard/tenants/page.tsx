import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { TenantsPageClient } from "./tenants-client";

export default async function TenantsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const tenants = await db.tenant.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const tenantsPlain = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    emergencyContact: t.emergencyContact,
    notes: t.notes,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground">
          Manage tenants and tenancies
        </p>
      </div>
      <TenantsPageClient initialTenants={tenantsPlain} />
    </div>
  );
}
