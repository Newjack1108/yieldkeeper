import { NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = Object.fromEntries(formData.entries()) as Record<string, string>;
  const from = params.From ?? "";
  const to = params.To ?? "";
  const body = params.Body ?? "";
  const messageSid = params.MessageSid ?? "";

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = request.headers.get("X-Twilio-Signature");
    if (!signature) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const url =
      process.env.WEBHOOK_BASE_URL &&
      process.env.WEBHOOK_BASE_URL.trim().length > 0
        ? `${process.env.WEBHOOK_BASE_URL.replace(/\/$/, "")}/api/webhooks/twilio/sms`
        : request.url;
    const isValid = twilio.validateRequest(authToken, signature, url, params);
    if (!isValid) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let tenantId: string | null = null;
  let propertyId: string | null = null;

  const normalizedFrom = normalizePhone(from);
  if (normalizedFrom.length > 0) {
    const tenants = await db.tenant.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true },
    });
    const matched = tenants.find((t) => {
      if (!t.phone) return false;
      return normalizePhone(t.phone) === normalizedFrom;
    });
    if (matched) {
      tenantId = matched.id;
      const tenancy = await db.tenancy.findFirst({
        where: { tenantId: matched.id, status: "active" },
        select: { propertyId: true },
      });
      if (tenancy) {
        propertyId = tenancy.propertyId;
      }
    }
  }

  await db.smsLog.create({
    data: {
      tenantId,
      propertyId,
      toPhone: from,
      messageType: "custom",
      direction: "inbound",
      twilioSid: messageSid,
      body,
      status: "received",
    },
  });

  return new NextResponse(null, { status: 200 });
}
