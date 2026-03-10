import { db } from "@/lib/db";

/**
 * Syncs rent schedule statuses: marks as "overdue" any schedule that is
 * still "pending" but has a due date in the past.
 */
export async function syncOverdueSchedules(userId: string): Promise<number> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  const tenancyIds = (
    await db.tenancy.findMany({
      where: { property: { portfolioId: { in: portfolioIds } } },
      select: { id: true },
    })
  ).map((t) => t.id);

  if (tenancyIds.length === 0) return 0;

  const result = await db.rentSchedule.updateMany({
    where: {
      tenancyId: { in: tenancyIds },
      status: "pending",
      dueDate: { lt: new Date() },
    },
    data: { status: "overdue" },
  });
  return result.count;
}
