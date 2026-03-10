import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground">
          Manage tenants and tenancies (Phase 2)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tenant management will be built in Phase 2.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
