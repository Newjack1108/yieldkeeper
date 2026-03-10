/**
 * SMS helper - supports test mode (no Twilio) and live Twilio.
 * When TWILIO_ACCOUNT_SID is not set, runs in test mode and simulates sends.
 */

import { db } from "@/lib/db";

export function isSmsTestMode(): boolean {
  return !(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

export function getSmsConfig(): {
  testMode: boolean;
  configured: boolean;
} {
  const testMode = isSmsTestMode();
  return {
    testMode,
    configured: !testMode,
  };
}

export async function sendSms(params: {
  toPhone: string;
  body: string;
  messageType: string;
  tenantId?: string;
  propertyId?: string;
}): Promise<{ success: boolean; twilioSid?: string | null }> {
  const { toPhone, body, messageType, tenantId, propertyId } = params;
  const testMode = isSmsTestMode();

  let twilioSid: string | null = null;
  let status = "sent";

  if (testMode) {
    status = "simulated";
  } else {
    try {
      const twilio = await import("twilio");
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      const msg = await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: toPhone,
      });
      twilioSid = msg.sid;
      status = msg.status ?? "sent";
    } catch (err) {
      console.error("Twilio send error:", err);
      return { success: false };
    }
  }

  await db.smsLog.create({
    data: {
      tenantId: tenantId ?? null,
      propertyId: propertyId ?? null,
      toPhone,
      messageType,
      direction: "outbound",
      twilioSid,
      body,
      status,
    },
  });

  return { success: true, twilioSid };
}
