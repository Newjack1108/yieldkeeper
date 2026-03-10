"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LettingAgent = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  setupFee: number | null;
  managementFeeType: string | null;
  managementFeeValue: number | null;
  inventoryFee: number | null;
  renewalFee: number | null;
  notes: string | null;
  propertyCount: number;
  createdAt?: string;
};

export function LettingAgentsPageClient({
  initialAgents,
}: {
  initialAgents: LettingAgent[];
}) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LettingAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [setupFee, setSetupFee] = useState("");
  const [managementFeeType, setManagementFeeType] = useState<string>("");
  const [managementFeeValue, setManagementFeeValue] = useState("");
  const [inventoryFee, setInventoryFee] = useState("");
  const [renewalFee, setRenewalFee] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCompany(editing.company ?? "");
      setEmail(editing.email ?? "");
      setPhone(editing.phone ?? "");
      setSetupFee(editing.setupFee != null ? String(editing.setupFee) : "");
      setManagementFeeType(editing.managementFeeType ?? "");
      setManagementFeeValue(editing.managementFeeValue != null ? String(editing.managementFeeValue) : "");
      setInventoryFee(editing.inventoryFee != null ? String(editing.inventoryFee) : "");
      setRenewalFee(editing.renewalFee != null ? String(editing.renewalFee) : "");
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setSetupFee("");
      setManagementFeeType("");
      setManagementFeeValue("");
      setInventoryFee("");
      setRenewalFee("");
      setNotes("");
    }
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        company: company || undefined,
        email: email || undefined,
        phone: phone || undefined,
        setupFee: setupFee ? parseFloat(setupFee) : undefined,
        managementFeeType: managementFeeType || undefined,
        managementFeeValue: managementFeeValue ? parseFloat(managementFeeValue) : undefined,
        inventoryFee: inventoryFee ? parseFloat(inventoryFee) : undefined,
        renewalFee: renewalFee ? parseFloat(renewalFee) : undefined,
        notes: notes || undefined,
      };

      if (editing) {
        const res = await fetch(`/api/letting-agents/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.name?.[0] || d.error || "Failed to update");
          return;
        }
      } else {
        if (!name) {
          setError("Name is required");
          return;
        }
        const res = await fetch("/api/letting-agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.name?.[0] || d.error || "Failed to create");
          return;
        }
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This will remove the letting agent from all properties."))
      return;
    const res = await fetch(`/api/letting-agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAgents((a) => a.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(a: LettingAgent) {
    setEditing(a);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setError(null);
  }

  function formatFee(a: LettingAgent) {
    if (a.managementFeeType === "percentage" && a.managementFeeValue != null) {
      return `${a.managementFeeValue}%`;
    }
    if (a.managementFeeType === "monthly" && a.managementFeeValue != null) {
      return `£${a.managementFeeValue}/mo`;
    }
    return "-";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Letting Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit letting agent" : "Add letting agent"}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ABC Letting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="ABC Property Management"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupFee">Setup Fee (£)</Label>
                <Input
                  id="setupFee"
                  name="setupFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={setupFee}
                  onChange={(e) => setSetupFee(e.target.value)}
                  placeholder="One-time setup"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Management Fee Type</Label>
                  <Select
                    value={managementFeeType || "none"}
                    onValueChange={(v) => setManagementFeeType(v === "none" ? "" : (v ?? ""))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="monthly">Monthly (fixed)</SelectItem>
                      <SelectItem value="percentage">Percentage of rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managementFeeValue">
                    {managementFeeType === "percentage" ? "Percentage (%)" : "Amount (£/mo)"}
                  </Label>
                  <Input
                    id="managementFeeValue"
                    name="managementFeeValue"
                    type="number"
                    min="0"
                    step={managementFeeType === "percentage" ? "0.1" : "0.01"}
                    value={managementFeeValue}
                    onChange={(e) => setManagementFeeValue(e.target.value)}
                    placeholder={managementFeeType === "percentage" ? "10" : "50"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventoryFee">Inventory Fee (£)</Label>
                  <Input
                    id="inventoryFee"
                    name="inventoryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={inventoryFee}
                    onChange={(e) => setInventoryFee(e.target.value)}
                    placeholder="Per tenancy start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renewalFee">Renewal Fee (£)</Label>
                  <Input
                    id="renewalFee"
                    name="renewalFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={renewalFee}
                    onChange={(e) => setRenewalFee(e.target.value)}
                    placeholder="Per renewal"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
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

      {agents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No letting agents yet. Click &quot;Add Letting Agent&quot; to create one, then
          assign them to properties in the Properties section.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Management Fee</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.company ?? "-"}</TableCell>
                  <TableCell>{formatFee(a)}</TableCell>
                  <TableCell>{a.setupFee != null ? `£${a.setupFee}` : "-"}</TableCell>
                  <TableCell>{a.inventoryFee != null ? `£${a.inventoryFee}` : "-"}</TableCell>
                  <TableCell>{a.propertyCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(a.id)}
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
