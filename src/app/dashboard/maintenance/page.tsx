import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MaintenancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground">
          Manage repair requests and contractors (Phase 6)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Maintenance module will be built in Phase 6.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
