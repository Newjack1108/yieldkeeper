"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Banknote, Calendar, ChevronDown, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TenancyRow = {
  id: string;
  propertyAddress: string;
  tenantName: string;
  rentAmount: number;
  rentFrequency: string;
  status: string;
  arrears: number;
  nextDueDate: string | null;
  nextDueStatus: string | null;
  schedules: { id: string; dueDate: string; amountDue: number; status: string }[];
};

type Property = { id: string; address: string };
type Tenant = { id: string; name: string };

export function RentPageClient({
  initialTenancies,
  properties,
  tenants,
}: {
  initialTenancies: TenancyRow[];
  properties: Property[];
  tenants: Tenant[];
}) {
  const router = useRouter();
  const [tenancies, setTenancies] = useState(initialTenancies);
  const [addOpen, setAddOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenancies(initialTenancies);
  }, [initialTenancies]);

  async function handleAddTenancy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      propertyId: formData.get("propertyId"),
      tenantId: formData.get("tenantId"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate") || undefined,
      rentAmount: Number(formData.get("rentAmount")),
      rentFrequency: formData.get("rentFrequency") || "monthly",
      depositAmount: formData.get("depositAmount")
        ? Number(formData.get("depositAmount"))
        : undefined,
      notes: formData.get("notes") || undefined,
      generateSchedules: true,
    };
    try {
      const res = await fetch("/api/tenancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.propertyId?.[0] || d.error || "Failed to create");
        return;
      }
      setAddOpen(false);
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const tenancyId = formData.get("tenancyId") as string;
    const rentScheduleId = formData.get("rentScheduleId") as string;
    const payload = {
      tenancyId,
      rentScheduleId: rentScheduleId || undefined,
      amount: Number(formData.get("amount")),
      paidDate: formData.get("paidDate"),
      method: formData.get("method") || undefined,
      notes: formData.get("notes") || undefined,
    };
    try {
      const res = await fetch("/api/rent-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to record payment");
        return;
      }
      setPaymentOpen(false);
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSchedules(tenancyId: string, months: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/rent-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenancyId, generateMonths: months }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add tenancy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add tenancy</DialogTitle>
            </DialogHeader>
            {(properties.length === 0 || tenants.length === 0) && (
              <p className="text-sm text-muted-foreground">
                {properties.length === 0
                  ? "Add a property first, then add tenants."
                  : "Add at least one tenant first."}
              </p>
            )}
            <form
              onSubmit={handleAddTenancy}
              className="space-y-4"
              key="add-tenancy"
            >
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
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
                <Label htmlFor="tenantId">Tenant</Label>
                <select
                  id="tenantId"
                  name="tenantId"
                  required
                  disabled={tenants.length === 0}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select tenant</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentAmount">Rent (£)</Label>
                  <Input
                    id="rentAmount"
                    name="rentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentFrequency">Frequency</Label>
                  <select
                    id="rentFrequency"
                    name="rentFrequency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Deposit (£)</Label>
                <Input
                  id="depositAmount"
                  name="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create tenancy"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger>
            <Button variant="outline">
              <Banknote className="mr-2 h-4 w-4" />
              Record payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record rent payment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleRecordPayment}
              className="space-y-4"
              key="record-payment"
            >
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tenancyId">Tenancy</Label>
                <select
                  id="tenancyId"
                  name="tenancyId"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select tenancy</option>
                  {tenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.propertyAddress} — {t.tenantName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentScheduleId">Apply to schedule (optional)</Label>
                <select
                  id="rentScheduleId"
                  name="rentScheduleId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— General payment —</option>
                  {tenancies.flatMap((t) =>
                    t.schedules
                      .filter((s) => s.status !== "paid")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {t.propertyAddress} — {s.dueDate} (£{s.amountDue}) — {s.status}
                        </option>
                      ))
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (£)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidDate">Date paid</Label>
                  <Input
                    id="paidDate"
                    name="paidDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  name="method"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— Select —</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="standing_order">Standing order</option>
                  <option value="direct_debit">Direct debit</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Recording..." : "Record payment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tenancies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              No tenancies yet. Add a tenancy to start tracking rent.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add tenancy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Arrears</TableHead>
                <TableHead>Next due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenancies.map((t) => (
                <React.Fragment key={t.id}>
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <TableCell className="w-[40px]">
                      {expandedId === t.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.propertyAddress}</TableCell>
                    <TableCell>{t.tenantName}</TableCell>
                    <TableCell>
                      £{t.rentAmount}
                      <span className="text-muted-foreground text-xs ml-1">
                        /{t.rentFrequency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.arrears > 0 ? (
                        <Badge variant="destructive">£{t.arrears}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.nextDueDate ? (
                        <Badge
                          variant={
                            t.nextDueStatus === "overdue" ? "destructive" : "secondary"
                          }
                        >
                          {t.nextDueDate}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSchedules(t.id, 6);
                          }}
                          disabled={loading}
                        >
                          Generate schedules
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === t.id && (
                    <TableRow key={`${t.id}-expanded`}>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Upcoming / overdue schedules</p>
                          {t.schedules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No schedules.{" "}
                              <Button
                                size="sm"
                                variant="link"
                                className="h-auto p-0"
                                onClick={() => handleGenerateSchedules(t.id, 6)}
                                disabled={loading}
                              >
                                Generate 6 months
                              </Button>
                            </p>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {t.schedules.map((s) => (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between"
                                >
                                  <span>{s.dueDate}</span>
                                  <span>£{s.amountDue}</span>
                                  <Badge
                                    variant={
                                      s.status === "overdue"
                                        ? "destructive"
                                        : s.status === "paid"
                                          ? "default"
                                          : "secondary"
                                    }
                                  >
                                    {s.status}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
