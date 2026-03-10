import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompliancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground">
          Track certificates and expiry dates (Phase 7)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compliance tracker will be built in Phase 7.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
