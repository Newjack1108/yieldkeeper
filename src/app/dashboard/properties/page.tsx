import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PropertiesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          Manage your property portfolio (Phase 2)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Property CRUD and management will be built in Phase 2.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
