import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { isSmsTestMode } from "@/lib/sms";

const sendSchema = z.object({
  tenantId: z.string().min(1),
  messageType: z.string().min(1).max(64),
  body: z.string().min(1).max(1600),
  propertyId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const tenant = await db.tenant.findFirst({
    where: { id: data.tenantId, userId: user.id },
    include: {
      tenancies: {
        include: {
          property: { select: { id: true, address: true } },
        },
      },
    },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (!tenant.phone) {
    return NextResponse.json(
      { error: "Tenant has no phone number on file" },
      { status: 400 }
    );
  }

  let propertyId: string | null = data.propertyId ?? null;
  if (propertyId) {
    const portfolioIds = (
      await db.portfolio.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
    ).map((p) => p.id);
    const property = await db.property.findFirst({
      where: { id: propertyId, portfolioId: { in: portfolioIds } },
    });
    if (!property) {
      propertyId = null;
    }
  }
  if (!propertyId && tenant.tenancies[0]) {
    propertyId = tenant.tenancies[0].property.id;
  }

  const testMode = isSmsTestMode();
  let twilioSid: string | null = null;
  let status = "sent";

  if (testMode) {
    twilioSid = null;
    status = "simulated";
  } else {
    try {
      const twilio = await import("twilio");
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      const msg = await client.messages.create({
        body: data.body,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: tenant.phone,
      });
      twilioSid = msg.sid;
      status = msg.status ?? "sent";
    } catch (err) {
      console.error("Twilio send error:", err);
      return NextResponse.json(
        {
          error: "Failed to send SMS",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  const log = await db.smsLog.create({
    data: {
      tenantId: tenant.id,
      propertyId,
      toPhone: tenant.phone,
      messageType: data.messageType,
      direction: "outbound",
      twilioSid,
      body: data.body,
      status,
    },
    include: { tenant: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json({
    id: log.id,
    testMode,
    status: log.status,
    sentAt: log.sentAt.toISOString(),
  });
}
