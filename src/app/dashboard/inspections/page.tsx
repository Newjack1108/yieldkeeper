import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InspectionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
        <p className="text-muted-foreground">
          Log and track property inspections (Phase 5)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Inspections module will be built in Phase 5.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
