import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { randomBytes } from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_QUARTER = 90;

/** Current quarter index since tenancy start (0, 1, 2, 3...) */
function getQuarterIndexSinceStart(tenancyStart: Date, at: Date): number {
  const ms = at.getTime() - tenancyStart.getTime();
  return Math.floor(ms / (DAYS_PER_QUARTER * MS_PER_DAY));
}

/** Find tenancies due for quarterly checklist based on tenancy start date (Q1, Q2, Q3, Q4) */
async function getTenanciesDueForQuarterlyChecklist() {
  const now = new Date();
  const tenancies = await db.tenancy.findMany({
    where: {
      status: "active",
      tenant: { phone: { not: null } },
    },
    include: {
      tenant: { select: { id: true, name: true, phone: true } },
      property: { select: { id: true, address: true } },
      quarterlyChecklists: true,
    },
  });

  return tenancies.filter((t) => {
    const currentQuarter = getQuarterIndexSinceStart(t.startDate, now);
    if (currentQuarter < 0) return false; // Tenancy not started yet

    const alreadySentForThisQuarter = t.quarterlyChecklists.some((qc) => {
      const sentQuarter = getQuarterIndexSinceStart(t.startDate, qc.createdAt);
      return sentQuarter === currentQuarter;
    });

    return !alreadySentForThisQuarter;
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
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
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
