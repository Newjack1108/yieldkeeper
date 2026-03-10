import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant record not found" },
      { status: 404 }
    );
  }

  const logs = await db.smsLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    logs.map((log) => ({
      id: log.id,
      toPhone: log.toPhone,
      messageType: log.messageType,
      direction: log.direction,
      body: log.body,
      status: log.status,
      sentAt: log.sentAt.toISOString(),
    }))
  );
}
