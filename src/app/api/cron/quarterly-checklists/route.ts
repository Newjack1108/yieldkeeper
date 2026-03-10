import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { randomBytes } from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

/** Find tenancies due for quarterly checklist (3 months since last or since tenancy start) */
function getTenanciesDueForQuarterlyChecklist() {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return db.tenancy.findMany({
    where: {
      status: "active",
      tenant: {
        phone: { not: null },
      },
    },
    include: {
      tenant: { select: { id: true, name: true, phone: true } },
      property: { select: { id: true, address: true } },
      quarterlyChecklists: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  }).then((tenancies) => {
    return tenancies.filter((t) => {
      const lastChecklist = t.quarterlyChecklists[0];
      if (lastChecklist) {
        return lastChecklist.createdAt < threeMonthsAgo;
      }
      return t.startDate < threeMonthsAgo;
    });
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = authHeader?.replace("Bearer ", "");

  if (CRON_SECRET && cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.WEBHOOK_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const tenancies = await getTenanciesDueForQuarterlyChecklist();
  const template = await db.smsTemplate.findUnique({
    where: { type: "quarterly_checklist", isActive: true },
  });

  const defaultContent =
    "Hi {{tenantName}}. Please complete your quarterly property check: {{checklistLink}}";

  let sent = 0;
  const errors: string[] = [];

  for (const tenancy of tenancies) {
    const phone = tenancy.tenant.phone;
    if (!phone) continue;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const checklist = await db.quarterlyChecklist.create({
      data: {
        tenancyId: tenancy.id,
        token,
        expiresAt,
      },
    });

    const link = `${baseUrl}/checklist/quarterly/${token}`;
    const content = (template?.content ?? defaultContent)
      .replace(/\{\{tenantName\}\}/g, tenancy.tenant.name)
      .replace(/\{\{address\}\}/g, tenancy.property.address)
      .replace(/\{\{checklistLink\}\}/g, link);

    const result = await sendSms({
      toPhone: phone,
      body: content,
      messageType: "quarterly_checklist",
      tenantId: tenancy.tenant.id,
      propertyId: tenancy.property.id,
    });

    if (result.success) {
      await db.quarterlyChecklist.update({
        where: { id: checklist.id },
        data: { sentAt: new Date() },
      });
      sent++;
    } else {
      errors.push(`Failed to send to tenancy ${tenancy.id}`);
    }
  }

  return NextResponse.json({
    sent,
    total: tenancies.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
