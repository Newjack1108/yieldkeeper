import { db } from "@/lib/db";

export type ContactInfo = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  type: "letting_agent" | "estate_agent" | "landlord";
};

export type NextRentDue = {
  dueDate: Date;
  amountDue: number;
};

export async function getNextRentDueForTenant(
  loginUserId: string
): Promise<NextRentDue | null> {
  const tenant = await db.tenant.findUnique({
    where: { loginUserId },
    select: { id: true },
  });
  if (!tenant) return null;

  const schedule = await db.rentSchedule.findFirst({
    where: {
      tenancy: {
        tenantId: tenant.id,
        status: { in: ["active", "ending_soon"] },
      },
      status: { in: ["pending", "overdue"] },
    },
    orderBy: { dueDate: "asc" },
  });

  if (!schedule) return null;
  return {
    dueDate: schedule.dueDate,
    amountDue: Number(schedule.amountDue),
  };
}

export async function getTenantForLoginUser(loginUserId: string) {
  return db.tenant.findUnique({
    where: { loginUserId },
    include: {
      tenancies: {
        where: { status: { in: ["active", "ending_soon"] } },
        include: {
          property: {
            include: {
              lettingAgent: true,
              estateAgent: true,
              portfolio: { include: { user: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Resolve contact for tenant's primary property.
 * Priority: Letting Agent > Estate Agent > Landlord
 */
export function resolveContact(tenancies: {
  property: {
    lettingAgent: { name: string; company: string | null; email: string | null; phone: string | null } | null;
    estateAgent: { name: string; company: string | null; email: string; phone: string | null } | null;
    portfolio: { user: { name: string | null; email: string } };
  };
}[]): ContactInfo | null {
  const tenancy = tenancies[0];
  if (!tenancy) return null;

  const { property } = tenancy;

  if (property.lettingAgent) {
    return {
      name: property.lettingAgent.name,
      company: property.lettingAgent.company ?? undefined,
      email: property.lettingAgent.email ?? property.portfolio.user.email,
      phone: property.lettingAgent.phone ?? undefined,
      type: "letting_agent",
    };
  }
  if (property.estateAgent) {
    return {
      name: property.estateAgent.name,
      company: property.estateAgent.company ?? undefined,
      email: property.estateAgent.email,
      phone: property.estateAgent.phone ?? undefined,
      type: "estate_agent",
    };
  }

  const landlord = property.portfolio.user;
  return {
    name: landlord.name ?? landlord.email,
    email: landlord.email,
    type: "landlord",
  };
}
