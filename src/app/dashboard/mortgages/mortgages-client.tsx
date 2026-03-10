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

type MortgageRow = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  lender: string;
  interestRate: number | null;
  loanBalance: number | null;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  nextPaymentDate: string | null;
  fixedRateEndDate: string | null;
  termEndDate: string | null;
  notes: string | null;
};

type Property = { id: string; address: string };

export function MortgagesPageClient({
  initialMortgages,
  properties,
}: {
  initialMortgages: MortgageRow[];
  properties: Property[];
}) {
  const router = useRouter();
  const [mortgages, setMortgages] = useState(initialMortgages);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MortgageRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMortgages(initialMortgages);
  }, [initialMortgages]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      propertyId: formData.get("propertyId"),
      lender: formData.get("lender"),
      interestRate: formData.get("interestRate")
        ? Number(formData.get("interestRate"))
        : null,
      loanBalance: formData.get("loanBalance")
        ? Number(formData.get("loanBalance"))
        : null,
      paymentAmount: formData.get("paymentAmount")
        ? Number(formData.get("paymentAmount"))
        : null,
      paymentFrequency: formData.get("paymentFrequency") || null,
      nextPaymentDate: formData.get("nextPaymentDate") || null,
      fixedRateEndDate: formData.get("fixedRateEndDate") || null,
      termEndDate: formData.get("termEndDate") || null,
      notes: formData.get("notes") || null,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/mortgages/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lender: payload.lender,
            interestRate: payload.interestRate,
            loanBalance: payload.loanBalance,
            paymentAmount: payload.paymentAmount,
            paymentFrequency: payload.paymentFrequency,
            nextPaymentDate: payload.nextPaymentDate,
            fixedRateEndDate: payload.fixedRateEndDate,
            termEndDate: payload.termEndDate,
            notes: payload.notes,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.lender?.[0] ?? d.error ?? "Failed to update");
          return;
        }
      } else {
        if (!payload.propertyId) {
          setError("Please select a property");
          return;
        }
        if (!payload.lender) {
          setError("Please enter the lender");
          return;
        }
        const res = await fetch("/api/mortgages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(
            d.error?.lender?.[0] ?? d.error?.propertyId?.[0] ?? "Failed to create"
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
    if (!confirm("Are you sure you want to delete this mortgage?")) return;
    const res = await fetch(`/api/mortgages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMortgages((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(m: MortgageRow) {
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
              Add mortgage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit mortgage" : "Add mortgage"}
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
                <Label htmlFor="lender">Lender</Label>
                <Input
                  id="lender"
                  name="lender"
                  required
                  defaultValue={editing?.lender ?? ""}
                  placeholder="e.g. Halifax"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest rate (%)</Label>
                  <Input
                    id="interestRate"
                    name="interestRate"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={editing?.interestRate ?? ""}
                    placeholder="e.g. 4.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment (£)</Label>
                  <Input
                    id="paymentAmount"
                    name="paymentAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={editing?.paymentAmount ?? ""}
                    placeholder="e.g. 980"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanBalance">Loan balance (£)</Label>
                <Input
                  id="loanBalance"
                  name="loanBalance"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={editing?.loanBalance ?? ""}
                  placeholder="Remaining balance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentFrequency">Payment frequency</Label>
                <select
                  id="paymentFrequency"
                  name="paymentFrequency"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue={editing?.paymentFrequency ?? "monthly"}
                >
                  <option value="">—</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nextPaymentDate">Next payment date</Label>
                  <Input
                    id="nextPaymentDate"
                    name="nextPaymentDate"
                    type="date"
                    defaultValue={editing?.nextPaymentDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixedRateEndDate">Fixed rate ends</Label>
                  <Input
                    id="fixedRateEndDate"
                    name="fixedRateEndDate"
                    type="date"
                    defaultValue={editing?.fixedRateEndDate ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="termEndDate">Term end date</Label>
                <Input
                  id="termEndDate"
                  name="termEndDate"
                  type="date"
                  defaultValue={editing?.termEndDate ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={editing?.notes ?? ""}
                  placeholder="Additional details"
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

      {mortgages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No mortgages yet. Click &quot;Add mortgage&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Next payment</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mortgages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.property.address}</TableCell>
                  <TableCell>{m.lender}</TableCell>
                  <TableCell>
                    {m.paymentAmount != null
                      ? `£${m.paymentAmount.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {m.nextPaymentDate ?? "—"}
                  </TableCell>
                  <TableCell>
                    {m.interestRate != null ? `${m.interestRate}%` : "—"}
                  </TableCell>
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
