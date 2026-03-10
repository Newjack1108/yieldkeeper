/**
 * SMS helper - supports test mode (no Twilio) and live Twilio.
 * When TWILIO_ACCOUNT_SID is not set, runs in test mode and simulates sends.
 */

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
