"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ComplianceRow = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  type: string;
  issueDate: string | null;
  expiryDate: string;
  certificateNumber: string | null;
  documentUrl: string | null;
  notes: string | null;
};

type Property = { id: string; address: string };

const TYPE_LABELS: Record<string, string> = {
  gas_safety: "Gas Safety",
  eicr: "EICR",
  epc: "EPC",
  smoke_alarm: "Smoke Alarm",
  hmo_license: "HMO License",
  insurance: "Insurance",
  other: "Other",
};

function getExpiryStatus(expiryDate: string): "ok" | "due_soon" | "expired" {
  const exp = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 90) return "due_soon";
  return "ok";
}

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const status = getExpiryStatus(expiryDate);
  const style =
    status === "expired"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      : status === "due_soon"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  const label =
    status === "expired"
      ? "Expired"
      : status === "due_soon"
        ? "Due soon"
        : "OK";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

export function CompliancePageClient({
  initialCompliance,
  properties,
}: {
  initialCompliance: ComplianceRow[];
  properties: Property[];
}) {
  const router = useRouter();
  const [compliance, setCompliance] = useState(initialCompliance);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState("other");

  useEffect(() => {
    setCompliance(initialCompliance);
  }, [initialCompliance]);

  useEffect(() => {
    if (editing) {
      setType(editing.type ?? "other");
    } else {
      setPropertyId("");
      setType("other");
    }
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      propertyId: formData.get("propertyId"),
      type: formData.get("type") || "other",
      issueDate: formData.get("issueDate") || null,
      expiryDate: formData.get("expiryDate"),
      certificateNumber: formData.get("certificateNumber") || null,
      documentUrl: formData.get("documentUrl") || null,
      notes: formData.get("notes") || null,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/compliance/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: payload.type,
            issueDate: payload.issueDate,
            expiryDate: payload.expiryDate,
            certificateNumber: payload.certificateNumber,
            documentUrl: payload.documentUrl,
            notes: payload.notes,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.expiryDate?.[0] ?? d.error ?? "Failed to update");
          return;
        }
      } else {
        if (!payload.propertyId) {
          setError("Please select a property");
          return;
        }
        if (!payload.expiryDate) {
          setError("Expiry date is required");
          return;
        }
        const res = await fetch("/api/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(
            d.error?.expiryDate?.[0] ??
              d.error?.propertyId?.[0] ??
              "Failed to create"
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
    if (
      !confirm("Are you sure you want to delete this compliance record?")
    )
      return;
    const res = await fetch(`/api/compliance/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompliance((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(c: ComplianceRow) {
    setEditing(c);
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
        <Dialog
          open={open}
          onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}
        >
          <DialogTrigger>
            <Button disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add compliance record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? "Edit compliance record"
                  : "Add compliance record"}
              </DialogTitle>
            </DialogHeader>
            <form
              key={editing?.id ?? "new"}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!editing ? (
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property</Label>
                  <Select
                    name="propertyId"
                    value={propertyId}
                    onValueChange={(v) => setPropertyId(v ?? "")}
                  >
                    <SelectTrigger className="h-9 w-full" disabled={properties.length === 0}>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <p className="text-sm text-muted-foreground">
                    {editing.property.address}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" value={type} onValueChange={(v) => setType(v ?? "other")}>
                  <SelectTrigger id="type" className="h-9 w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue date</Label>
                  <Input
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    defaultValue={editing?.issueDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    required
                    defaultValue={editing?.expiryDate ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Certificate number</Label>
                <Input
                  id="certificateNumber"
                  name="certificateNumber"
                  defaultValue={editing?.certificateNumber ?? ""}
                  placeholder="e.g. GAS-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentUrl">Document URL</Label>
                <Input
                  id="documentUrl"
                  name="documentUrl"
                  type="url"
                  defaultValue={editing?.documentUrl ?? ""}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={editing?.notes ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeDialog()}
                >
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

      {compliance.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No compliance records yet. Click &quot;Add compliance record&quot; to
          get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Expiry date</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compliance.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.property.address}</TableCell>
                  <TableCell>{TYPE_LABELS[c.type] ?? c.type}</TableCell>
                  <TableCell>{c.issueDate ?? "—"}</TableCell>
                  <TableCell>{c.expiryDate}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.certificateNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ExpiryBadge expiryDate={c.expiryDate} />
                  </TableCell>
                  <TableCell>
                    {c.documentUrl ? (
                      <a
                        href={c.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(c.id)}
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
