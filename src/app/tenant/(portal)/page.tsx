import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare, FileText, Wrench, Mail, Phone, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser, getNextRentDueForTenant, resolveContact } from "@/lib/tenant-portal";

export default async function TenantDashboardPage() {
  const { user } = await validateRequest();
  if (!user || user.role !== "tenant") return null;

  const [tenant, nextRent] = await Promise.all([
    getTenantForLoginUser(user.id),
    getNextRentDueForTenant(user.id),
  ]);
  if (!tenant) return null;

  const contact = resolveContact(tenant.tenancies);
  const tenancies = tenant.tenancies.map((t) => ({
    id: t.id,
    address: t.property.address,
    status: t.status,
  }));

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Welcome, {tenant.name}
        </h1>
        <p className="text-muted-foreground">
          Your tenant portal for communications, documents, and maintenance
        </p>
      </div>

      {nextRent && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Next rent due
            </p>
            <p className="mt-1 text-2xl font-bold">
              {format(nextRent.dueDate, "dd MMM yyyy")} · £
              {nextRent.amountDue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      )}

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
            <div className="space-y-3 md:space-y-2">
              <p className="font-medium">{contact.name}</p>
              {contact.company && (
                <p className="text-sm text-muted-foreground">
                  {contact.company}
                </p>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border border-transparent px-3 py-2 -mx-1 text-primary hover:bg-muted/50 hover:underline active:bg-muted/70 md:min-h-0 md:px-0 md:-mx-0"
                >
                  <Mail className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
                  <span className="break-all">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border border-transparent px-3 py-2 -mx-1 text-primary hover:bg-muted/50 hover:underline active:bg-muted/70 md:min-h-0 md:px-0 md:-mx-0"
                >
                  <Phone className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
                  <span>{contact.phone}</span>
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
        <Link href="/tenant/communications" className="block min-h-[88px] md:min-h-0">
          <Card className="h-full min-h-[88px] transition-colors hover:bg-muted/50 md:min-h-0">
            <CardHeader className="pb-2 md:pb-6">
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
        <Link href="/tenant/documents" className="block min-h-[88px] md:min-h-0">
          <Card className="h-full min-h-[88px] transition-colors hover:bg-muted/50 md:min-h-0">
            <CardHeader className="pb-2 md:pb-6">
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
        <Link href="/tenant/maintenance" className="block min-h-[88px] md:min-h-0">
          <Card className="h-full min-h-[88px] transition-colors hover:bg-muted/50 md:min-h-0">
            <CardHeader className="pb-2 md:pb-6">
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
