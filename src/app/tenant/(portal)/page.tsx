import Link from "next/link";
import { MessageSquare, FileText, Wrench, Mail, Phone, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser, resolveContact } from "@/lib/tenant-portal";

export default async function TenantDashboardPage() {
  const { user } = await validateRequest();
  if (!user || user.role !== "tenant") return null;

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) return null;

  const contact = resolveContact(tenant.tenancies);
  const tenancies = tenant.tenancies.map((t) => ({
    id: t.id,
    address: t.property.address,
    status: t.status,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {tenant.name}
        </h1>
        <p className="text-muted-foreground">
          Your tenant portal for communications, documents, and maintenance
        </p>
      </div>

      {contact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground capitalize">
              {contact.type.replace("_", " ")}
            </p>
            <div className="space-y-2">
              <p className="font-medium">{contact.name}</p>
              {contact.company && (
                <p className="text-sm text-muted-foreground">
                  {contact.company}
                </p>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {contact.phone}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tenancies.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Your property</h2>
          <p className="text-muted-foreground">
            {tenancies[0].address}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/tenant/communications">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <CardTitle>Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View all messages between you and your landlord or agent
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tenant/documents">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <FileText className="h-8 w-8 text-muted-foreground" />
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access your tenancy agreement and related documents
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tenant/maintenance">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <Wrench className="h-8 w-8 text-muted-foreground" />
              <CardTitle>Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request repairs or view the status of maintenance jobs
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
