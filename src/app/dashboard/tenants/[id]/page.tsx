import { redirect, notFound } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { getTenantProfile } from "@/lib/tenant-profile";
import { db } from "@/lib/db";
import { TenantProfileClient } from "./tenant-profile-client";

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const [profile, templates] = await Promise.all([
    getTenantProfile(id, user.id),
    db.smsTemplate.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
    }),
  ]);
  if (!profile) notFound();

  const smsConfig = {
    testMode:
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER,
  };

  const templatesFormatted = templates.map((t) => ({
    id: t.id,
    type: t.type,
    content: t.content,
    isActive: t.isActive,
  }));

  const firstTenancy = profile.tenancies[0];
  const address = firstTenancy?.property?.address ?? "";
  const amount =
    firstTenancy?.rentSchedules?.[0]?.amountDue != null
      ? `£${Number(firstTenancy.rentSchedules[0].amountDue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
      : firstTenancy?.rentAmount != null
        ? `£${Number(firstTenancy.rentAmount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
        : "";

  return (
    <div className="space-y-6">
      <TenantProfileClient
        initialProfile={profile}
        templates={templatesFormatted}
        smsConfig={smsConfig}
        smsContext={{ address, amount }}
        canInvite={
          (user.role === "portfolio_owner" || user.role === "admin") &&
          !!profile.tenant.email &&
          !profile.tenant.loginUserId
        }
        canResendInvite={
          (user.role === "portfolio_owner" || user.role === "admin") &&
          !!profile.tenant.email &&
          !!profile.tenant.loginUserId
        }
      />
    </div>
  );
}
