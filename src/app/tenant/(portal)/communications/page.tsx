import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { CommunicationsClient } from "./communications-client";

export default async function TenantCommunicationsPage() {
  const { user } = await validateRequest();
  if (!user || user.role !== "tenant") return null;

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) return null;

  const logs = await db.smsLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  const communications = logs.map((log) => ({
    id: log.id,
    toPhone: log.toPhone,
    messageType: log.messageType,
    direction: log.direction,
    body: log.body,
    status: log.status,
    sentAt: log.sentAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Messages between you and your landlord or agent
        </p>
      </div>
      <CommunicationsClient communications={communications} />
    </div>
  );
}
