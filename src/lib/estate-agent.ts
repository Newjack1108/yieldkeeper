import { db } from "@/lib/db";

/**
 * Get property IDs that an estate agent user can access.
 * Returns empty array if user is not an estate agent or has no linked EstateAgent.
 */
export async function getAgentPropertyIds(userId: string): Promise<string[]> {
  const estateAgent = await db.estateAgent.findUnique({
    where: { userId },
    select: {
      properties: {
        select: { id: true },
      },
    },
  });

  if (!estateAgent) return [];
  return estateAgent.properties.map((p) => p.id);
}

/**
 * Get property IDs the user can access based on role.
 * For portfolio_owner/admin: all properties in their portfolios.
 * For estate_agent: only properties assigned to their EstateAgent.
 */
export async function getPropertyIdsForUser(
  userId: string,
  role: string
): Promise<string[]> {
  if (role === "estate_agent") {
    return getAgentPropertyIds(userId);
  }
  // admin and portfolio_owner use portfolio-based access
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  if (portfolioIds.length === 0) return [];
  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true },
  });
  return properties.map((p) => p.id);
}

/**
 * Check if user can access a tenancy (for rent, tenancy details, etc.)
 */
export async function canAccessTenancy(
  tenancyId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return false;
  const tenancy = await db.tenancy.findFirst({
    where: {
      id: tenancyId,
      propertyId: { in: propertyIds },
    },
  });
  return !!tenancy;
}

/**
 * Get the EstateAgent record for an estate agent user.
 * Returns null if user is not an estate agent.
 */
export async function getEstateAgentForUser(userId: string) {
  return db.estateAgent.findUnique({
    where: { userId },
    include: {
      properties: {
        include: {
          portfolio: true,
        },
      },
    },
  });
}
