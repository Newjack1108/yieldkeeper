import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { SmsPageClient } from "./sms-client";

export default async function SmsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const [tenants, templates, logs, statusRes] = await Promise.all([
    db.tenant.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.smsTemplate.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
    }),
    db.smsLog.findMany({
      where: { tenant: { userId: user.id } },
      include: { tenant: { select: { id: true, name: true, phone: true } } },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
    (async () => {
      const configured =
        !!process.env.TWILIO_ACCOUNT_SID &&
        !!process.env.TWILIO_AUTH_TOKEN &&
        !!process.env.TWILIO_PHONE_NUMBER;
      return { testMode: !configured, configured };
    })(),
  ]);

  const logsFormatted = logs.map((log) => ({
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
  }));

  const tenantsWithPhone = tenants.filter((t) => t.phone);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SMS</h1>
        <p className="text-muted-foreground">
          Send rent reminders, maintenance updates, and more to tenants
        </p>
      </div>
      <SmsPageClient
        initialLogs={logsFormatted}
        tenants={tenantsWithPhone}
        templates={templates}
        smsConfig={statusRes}
      />
    </div>
  );
}
