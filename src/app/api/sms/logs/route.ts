import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

async function getUserTenantIds(userId: string): Promise<string[]> {
  const tenants = await db.tenant.findMany({
    where: { userId },
    select: { id: true },
  });
  return tenants.map((t) => t.id);
}

export async function GET(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantIds = await getUserTenantIds(user.id);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const tenantIdFilter = searchParams.get("tenantId");

  const where: { tenantId?: { in: string[] } | string } = {
    tenantId: { in: tenantIds },
  };
  if (tenantIdFilter && tenantIds.includes(tenantIdFilter)) {
    where.tenantId = tenantIdFilter;
  }

  const logs = await db.smsLog.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { sentAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      propertyId: log.propertyId,
      tenant: log.tenant,
      toPhone: log.toPhone,
      messageType: log.messageType,
      direction: log.direction,
      body: log.body,
      status: log.status,
      sentAt: log.sentAt.toISOString(),
    }))
  );
}
