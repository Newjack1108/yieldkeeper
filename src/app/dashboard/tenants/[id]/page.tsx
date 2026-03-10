import { redirect, notFound } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { getTenantProfile } from "@/lib/tenant-profile";
import { TenantProfileClient } from "./tenant-profile-client";

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const profile = await getTenantProfile(id, user.id);
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <TenantProfileClient
        initialProfile={profile}
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
