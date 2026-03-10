import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Store and link documents (Phase 10)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Document vault will be built in Phase 10.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
