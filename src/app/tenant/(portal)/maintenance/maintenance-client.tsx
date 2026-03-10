"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  urgent: "Urgent",
  emergency: "Emergency",
};

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  assigned: "Assigned",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In progress",
  completed: "Completed",
};

type Tenancy = { id: string; address: string };
type Maintenance = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  reportedDate: string;
  completedDate: string | null;
  propertyAddress: string | null;
};

export function MaintenanceClient({
  tenancies,
  maintenance,
}: {
  tenancies: Tenancy[];
  maintenance: Maintenance[];
}) {
  const router = useRouter();
  const [tenancyId, setTenancyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tenant-portal/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId,
          title,
          description: description || null,
          priority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.title?.[0] ?? data.error ?? "Failed to submit");
        setLoading(false);
        return;
      }
      setTenancyId("");
      setTitle("");
      setDescription("");
      setPriority("medium");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Request a repair</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenancyId">Property</Label>
              <Select
                value={tenancyId}
                onValueChange={(v) => setTenancyId(v ?? "")}
                required
              >
                <SelectTrigger id="tenancyId">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {tenancies.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Leaking tap in kitchen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading || tenancies.length === 0}>
              {loading ? "Submitting..." : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your maintenance requests</h2>
        {maintenance.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No maintenance requests yet
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {format(new Date(m.reportedDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PRIORITY_LABELS[m.priority] ?? m.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === "completed" ? "default" : "outline"
                        }
                      >
                        {STATUS_LABELS[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
