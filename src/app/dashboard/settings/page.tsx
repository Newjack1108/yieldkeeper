import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsPageClient } from "./settings-client";

export default async function SettingsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  if (user.role === "estate_agent") {
    redirect("/dashboard");
  }

  const [templates, lettingAgentCount, landlordCompanyCount] = await Promise.all([
    db.smsTemplate.findMany({
      orderBy: { type: "asc" },
    }),
    db.lettingAgent.count({ where: { userId: user.id } }),
    db.landlordCompany.count({ where: { userId: user.id } }),
  ]);

  const templatesFormatted = templates.map((t) => ({
    id: t.id,
    type: t.type,
    content: t.content,
    isActive: t.isActive,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, letting agents, landlord companies, and SMS templates
        </p>
      </div>
      <SettingsPageClient
        user={{ id: user.id, email: user.email, name: user.name }}
        initialTemplates={templatesFormatted}
        lettingAgentCount={lettingAgentCount}
        landlordCompanyCount={landlordCompanyCount}
      />
    </div>
  );
}
