"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MaintenanceRow = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  tenancyId: string | null;
  tenancy: { id: string; tenant: { id: string; name: string } } | null;
  contractorId: string | null;
  contractor: { id: string; name: string; tradeType: string | null } | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  reportedDate: string;
  completedDate: string | null;
  invoiceUrl: string | null;
};

type Property = { id: string; address: string };
type TenancyOption = { id: string; propertyId: string; label: string };
type ContractorOption = { id: string; name: string; tradeType: string | null };

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

function PriorityBadge({ priority }: { priority: string }) {
  const style =
    priority === "emergency"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      : priority === "urgent"
        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
        : priority === "medium"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : status === "in_progress"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
        : status === "quoted" || status === "approved"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          : status === "assigned"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function MaintenancePageClient({
  initialMaintenance,
  properties,
  tenancies,
  contractors,
}: {
  initialMaintenance: MaintenanceRow[];
  properties: Property[];
  tenancies: TenancyOption[];
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMaintenance(initialMaintenance);
  }, [initialMaintenance]);

  const tenanciesForProperty = (propertyId: string) =>
    tenancies.filter((t) => t.propertyId === propertyId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      propertyId: formData.get("propertyId"),
      tenancyId: formData.get("tenancyId") || null,
      contractorId: formData.get("contractorId") || null,
      title: formData.get("title"),
      description: formData.get("description") || null,
      priority: formData.get("priority") || "medium",
      status: formData.get("status") || "reported",
      estimatedCost: formData.get("estimatedCost")
        ? Number(formData.get("estimatedCost"))
        : null,
      actualCost: formData.get("actualCost")
        ? Number(formData.get("actualCost"))
        : null,
      completedDate: formData.get("completedDate") || null,
      invoiceUrl: formData.get("invoiceUrl") || null,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/maintenance/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenancyId: payload.tenancyId,
            contractorId: payload.contractorId,
            title: payload.title,
            description: payload.description,
            priority: payload.priority,
            status: payload.status,
            estimatedCost: payload.estimatedCost,
            actualCost: payload.actualCost,
            completedDate: payload.completedDate,
            invoiceUrl: payload.invoiceUrl,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(
            d.error?.title?.[0] ?? d.error ?? "Failed to update"
          );
          return;
        }
      } else {
        if (!payload.propertyId) {
          setError("Please select a property");
          return;
        }
        if (!payload.title) {
          setError("Please enter a title");
          return;
        }
        const res = await fetch("/api/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(
            d.error?.title?.[0] ?? d.error?.propertyId?.[0] ?? "Failed to create"
          );
          return;
        }
      }
      setOpen(false);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this maintenance request?"))
      return;
    const res = await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMaintenance((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(m: MaintenanceRow) {
    setEditing(m);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
          <DialogTrigger>
            <Button disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add maintenance request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit maintenance request" : "Add maintenance request"}
              </DialogTitle>
            </DialogHeader>
            <form
              key={editing?.id ?? "new"}
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
            >
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Property</Label>
                    <select
                      id="propertyId"
                      name="propertyId"
                      required
                      disabled={properties.length === 0}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Select property</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                    <select
                      id="tenancyId"
                      name="tenancyId"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">None</option>
                      {tenancies.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <p className="text-sm text-muted-foreground">
                    {editing.property.address}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                    <select
                      id="tenancyId"
                      name="tenancyId"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      defaultValue={editing?.tenancyId ?? ""}
                    >
                      <option value="">None</option>
                      {tenanciesForProperty(editing.propertyId).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="contractorId">Contractor (optional)</Label>
                <select
                  id="contractorId"
                  name="contractorId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue={editing?.contractorId ?? ""}
                >
                  <option value="">None</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.tradeType ? ` (${c.tradeType})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={editing?.title ?? ""}
                  placeholder="e.g. Boiler not heating water"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  placeholder="Details of the issue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    name="priority"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={editing?.priority ?? "medium"}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={editing?.status ?? "reported"}
                  >
                    <option value="reported">Reported</option>
                    <option value="assigned">Assigned</option>
                    <option value="quoted">Quoted</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedCost">Estimated cost (£)</Label>
                  <Input
                    id="estimatedCost"
                    name="estimatedCost"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={editing?.estimatedCost ?? ""}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualCost">Actual cost (£)</Label>
                  <Input
                    id="actualCost"
                    name="actualCost"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={editing?.actualCost ?? ""}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="completedDate">Completed date (optional)</Label>
                <Input
                  id="completedDate"
                  name="completedDate"
                  type="date"
                  defaultValue={editing?.completedDate ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceUrl">Invoice URL (optional)</Label>
                <Input
                  id="invoiceUrl"
                  name="invoiceUrl"
                  type="url"
                  defaultValue={editing?.invoiceUrl ?? ""}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => closeDialog()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {maintenance.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No maintenance requests yet. Click &quot;Add maintenance request&quot; to
          get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.property.address}</TableCell>
                  <TableCell>{m.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.tenancy?.tenant.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={m.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell>
                    {m.actualCost != null
                      ? `£${m.actualCost.toFixed(2)}`
                      : m.estimatedCost != null
                        ? `~£${m.estimatedCost.toFixed(2)}`
                        : "—"}
                  </TableCell>
                  <TableCell>{m.reportedDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
