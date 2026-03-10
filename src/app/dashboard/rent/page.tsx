import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rent Tracking</h1>
        <p className="text-muted-foreground">
          Track rent schedules and payments (Phase 3)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rent tracking will be built in Phase 3.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
