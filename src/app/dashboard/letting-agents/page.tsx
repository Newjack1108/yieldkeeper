import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { LettingAgentsPageClient } from "./letting-agents-client";

export default async function LettingAgentsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  if (user.role === "estate_agent") {
    redirect("/dashboard");
  }

  const agents = await db.lettingAgent.findMany({
    where: { userId: user.id },
    include: { _count: { select: { properties: true } } },
    orderBy: { name: "asc" },
  });

  const agentsWithCount = agents.map((a) => ({
    id: a.id,
    name: a.name,
    company: a.company,
    email: a.email,
    phone: a.phone,
    setupFee: a.setupFee != null ? Number(a.setupFee) : null,
    managementFeeType: a.managementFeeType,
    managementFeeValue: a.managementFeeValue != null ? Number(a.managementFeeValue) : null,
    inventoryFee: a.inventoryFee != null ? Number(a.inventoryFee) : null,
    renewalFee: a.renewalFee != null ? Number(a.renewalFee) : null,
    notes: a.notes,
    propertyCount: a._count.properties,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Letting Agents</h1>
        <p className="text-muted-foreground">
          Manage letting agents and their fee structures. Assign agents to properties to include their costs in dashboard figures.
        </p>
      </div>
      <LettingAgentsPageClient initialAgents={agentsWithCount} />
    </div>
  );
}
