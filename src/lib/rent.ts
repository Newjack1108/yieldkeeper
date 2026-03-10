import { db } from "@/lib/db";
import { getPropertyIdsForUser } from "@/lib/estate-agent";

/**
 * Syncs rent schedule statuses: marks as "overdue" any schedule that is
 * still "pending" but has a due date in the past.
 */
export async function syncOverdueSchedules(
  userId: string,
  role: string = "portfolio_owner"
): Promise<number> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return 0;
  const tenancyIds = (
    await db.tenancy.findMany({
      where: { propertyId: { in: propertyIds } },
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
