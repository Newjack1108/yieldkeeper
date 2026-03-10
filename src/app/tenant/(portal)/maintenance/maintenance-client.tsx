"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type Tenancy = { id: string; address: string; propertyId?: string };
type Maintenance = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  reportedDate: string;
  completedDate: string | null;
  propertyAddress: string | null;
  quotedAmount: number | null;
  paymentStatus: string;
  tenantPaidAmount: number | null;
  estimatedCost: number | null;
  propertyMaintenanceTaskId: string | null;
  taskName?: string;
};
type AvailableTask = { id: string; taskType: string; name: string; price: number };
type AvailableTasksByProperty = {
  tenancyId: string;
  propertyAddress: string;
  tasks: AvailableTask[];
};

function PayForm({
  maintenanceId,
  amount,
  onSuccess,
  onCancel,
}: {
  maintenanceId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/maintenance?payment=success`,
          receipt_email: undefined,
        },
      });
      if (submitError) {
        setError(submitError.message ?? "Payment failed");
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !stripe || !elements}>
          {loading ? "Processing..." : `Pay £${amount.toFixed(2)}`}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function MaintenanceClient({
  tenancies,
  maintenance,
  availableTasks,
}: {
  tenancies: Tenancy[];
  maintenance: Maintenance[];
  availableTasks: AvailableTasksByProperty[];
}) {
  const router = useRouter();
  const [tenancyId, setTenancyId] = useState("");
  const [requestType, setRequestType] = useState<"predefined" | "custom">("predefined");
  const [propertyMaintenanceTaskId, setPropertyMaintenanceTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (key) setStripePromise(loadStripe(key));
  }, []);

  const tasksForTenancy = tenancyId
    ? availableTasks.find((a) => a.tenancyId === tenancyId)?.tasks ?? []
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        tenancyId,
        priority,
      };
      if (requestType === "predefined" && propertyMaintenanceTaskId) {
        body.propertyMaintenanceTaskId = propertyMaintenanceTaskId;
      } else {
        if (!title.trim()) {
          setError("Please enter a title for your request");
          setLoading(false);
          return;
        }
        body.title = title;
        body.description = description || null;
      }
      const res = await fetch("/api/tenant-portal/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.title?.[0] ?? data.error ?? "Failed to submit");
        setLoading(false);
        return;
      }
      setTenancyId("");
      setPropertyMaintenanceTaskId("");
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

  async function handlePayClick(m: Maintenance) {
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${m.id}/create-payment-intent`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start payment");
        return;
      }
      setClientSecret(data.clientSecret);
      setPayingId(m.id);
    } catch {
      setError("Failed to start payment");
    }
  }

  function getPayableAmount(m: Maintenance): number | null {
    if (m.paymentStatus === "paid") return null;
    if (m.propertyMaintenanceTaskId && m.estimatedCost != null) return m.estimatedCost;
    if (m.quotedAmount != null) return m.quotedAmount;
    return m.estimatedCost;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Request maintenance</CardTitle>
          <p className="text-muted-foreground text-sm">
            Choose a predefined task or describe a custom request
          </p>
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
                onValueChange={(v) => {
                  setTenancyId(v ?? "");
                  setPropertyMaintenanceTaskId("");
                }}
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
              <Label>Request type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={requestType === "predefined"}
                    onChange={() => setRequestType("predefined")}
                  />
                  Predefined task
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={requestType === "custom"}
                    onChange={() => setRequestType("custom")}
                  />
                  Custom request
                </label>
              </div>
            </div>

            {requestType === "predefined" ? (
              <div className="space-y-2">
                <Label>Select task</Label>
                {tasksForTenancy.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No tasks available for this property. Use a custom request
                    instead.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tasksForTenancy.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() =>
                          setPropertyMaintenanceTaskId(
                            propertyMaintenanceTaskId === task.id ? "" : task.id
                          )
                        }
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          propertyMaintenanceTaskId === task.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span>{task.name}</span>
                        <span className="font-medium">£{task.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Leaking tap in kitchen"
                    required={requestType === "custom"}
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
              </>
            )}

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
            <Button
              type="submit"
              disabled={
                loading ||
                tenancies.length === 0 ||
                (requestType === "predefined" && !propertyMaintenanceTaskId) ||
                (requestType === "custom" && !title.trim())
              }
            >
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((m) => {
                  const payable = getPayableAmount(m);
                  const canPay =
                    payable != null &&
                    payable > 0 &&
                    m.paymentStatus !== "paid" &&
                    m.paymentStatus !== "pending";
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        {format(new Date(m.reportedDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{m.title}</TableCell>
                      <TableCell>
                        {m.quotedAmount != null
                          ? `£${m.quotedAmount.toFixed(2)} (quoted)`
                          : m.estimatedCost != null
                            ? `£${m.estimatedCost.toFixed(2)}`
                            : "—"}
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
                      <TableCell>
                        {m.paymentStatus === "paid"
                          ? `Paid £${(m.tenantPaidAmount ?? 0).toFixed(2)}`
                          : m.paymentStatus === "pending"
                            ? "Awaiting payment"
                            : canPay
                              ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePayClick(m)}
                                >
                                  Pay £{payable.toFixed(2)}
                                </Button>
                              )
                              : "—"}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!payingId} onOpenChange={(v) => !v && (setPayingId(null), setClientSecret(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay for maintenance</DialogTitle>
          </DialogHeader>
          {payingId && clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <PayForm
                maintenanceId={payingId}
                amount={
                  maintenance.find((m) => m.id === payingId)
                    ? getPayableAmount(
                        maintenance.find((m) => m.id === payingId)!
                      ) ?? 0
                    : 0
                }
                onSuccess={() => {
                  setPayingId(null);
                  setClientSecret(null);
                  router.refresh();
                }}
                onCancel={() => {
                  setPayingId(null);
                  setClientSecret(null);
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
