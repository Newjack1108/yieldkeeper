import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstateAgentsPageClient } from "./estate-agents-client";

export default async function EstateAgentsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  if (user.role === "estate_agent") {
    redirect("/dashboard");
  }

  const agents = await db.estateAgent.findMany({
    where: { createdByUserId: user.id },
    include: {
      user: { select: { email: true, name: true } },
      _count: { select: { properties: true } },
    },
    orderBy: { name: "asc" },
  });

  const agentsWithCount = agents.map((a) => ({
    id: a.id,
    userId: a.userId,
    name: a.name,
    company: a.company,
    email: a.email,
    phone: a.phone,
    notes: a.notes,
    userEmail: a.user.email,
    userName: a.user.name,
    propertyCount: a._count.properties,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estate Agents</h1>
        <p className="text-muted-foreground">
          Manage estate agents and assign them to properties
        </p>
      </div>
      <EstateAgentsPageClient initialAgents={agentsWithCount} />
    </div>
  );
}
