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

type InsuranceRow = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  provider: string;
  policyNumber: string | null;
  premium: number | null;
  renewalDate: string | null;
  coverageNotes: string | null;
};

type Property = { id: string; address: string };

export function InsurancePageClient({
  initialPolicies,
  properties,
}: {
  initialPolicies: InsuranceRow[];
  properties: Property[];
}) {
  const router = useRouter();
  const [policies, setPolicies] = useState(initialPolicies);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      propertyId: formData.get("propertyId"),
      provider: formData.get("provider"),
      policyNumber: formData.get("policyNumber") || null,
      premium: formData.get("premium") ? Number(formData.get("premium")) : null,
      renewalDate: formData.get("renewalDate") || null,
      coverageNotes: formData.get("coverageNotes") || null,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/insurance/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: payload.provider,
            policyNumber: payload.policyNumber,
            premium: payload.premium,
            renewalDate: payload.renewalDate,
            coverageNotes: payload.coverageNotes,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.provider?.[0] ?? d.error ?? "Failed to update");
          return;
        }
      } else {
        if (!payload.propertyId) {
          setError("Please select a property");
          return;
        }
        if (!payload.provider) {
          setError("Please enter the provider");
          return;
        }
        const res = await fetch("/api/insurance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(
            d.error?.provider?.[0] ?? d.error?.propertyId?.[0] ?? "Failed to create"
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
    if (!confirm("Are you sure you want to delete this insurance policy?")) return;
    const res = await fetch(`/api/insurance/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPolicies((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(p: InsuranceRow) {
    setEditing(p);
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
              Add insurance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit insurance policy" : "Add insurance policy"}
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
              ) : (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <p className="text-sm text-muted-foreground">
                    {editing.property.address}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  name="provider"
                  required
                  defaultValue={editing?.provider ?? ""}
                  placeholder="e.g. Aviva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy number (optional)</Label>
                <Input
                  id="policyNumber"
                  name="policyNumber"
                  defaultValue={editing?.policyNumber ?? ""}
                  placeholder="e.g. POL-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="premium">Premium (£)</Label>
                <Input
                  id="premium"
                  name="premium"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={editing?.premium ?? ""}
                  placeholder="e.g. 189"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalDate">Renewal date</Label>
                <Input
                  id="renewalDate"
                  name="renewalDate"
                  type="date"
                  defaultValue={editing?.renewalDate ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverageNotes">Coverage notes (optional)</Label>
                <Input
                  id="coverageNotes"
                  name="coverageNotes"
                  defaultValue={editing?.coverageNotes ?? ""}
                  placeholder="e.g. Building and contents"
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

      {policies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No insurance policies yet. Click &quot;Add insurance&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Policy number</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Renewal date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.property.address}</TableCell>
                  <TableCell>{p.provider}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.policyNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    {p.premium != null ? `£${p.premium.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>{p.renewalDate ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(p.id)}
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
