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

type Property = {
  id: string;
  address: string;
  propertyType: string | null;
  bedrooms: number | null;
  purchasePrice: number | null;
  currentValue: number | null;
  occupancyStatus: string | null;
  notes: string | null;
  portfolio: { name: string };
  estateAgentId?: string | null;
  estateAgent?: { id: string; name: string } | null;
};

type Portfolio = { id: string; name: string };

type EstateAgent = { id: string; name: string; company: string | null };

export function PropertiesPageClient({
  initialProperties,
  portfolios,
  estateAgents,
  userRole,
}: {
  initialProperties: Property[];
  portfolios: Portfolio[];
  estateAgents: EstateAgent[];
  userRole: string;
}) {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? "");
  const [propertyType, setPropertyType] = useState("");
  const [occupancyStatus, setOccupancyStatus] = useState("vacant");
  const [estateAgentId, setEstateAgentId] = useState<string | null>(null);

  const isOwner = userRole === "portfolio_owner" || userRole === "admin";

  useEffect(() => {
    setProperties(initialProperties);
  }, [initialProperties]);

  useEffect(() => {
    if (editing) {
      setPropertyType(editing.propertyType ?? "");
      setOccupancyStatus(editing.occupancyStatus ?? "vacant");
      setEstateAgentId(editing.estateAgentId ?? null);
    } else {
      setPortfolioId(portfolios[0]?.id ?? "");
      setPropertyType("");
      setOccupancyStatus("vacant");
      setEstateAgentId(null);
    }
  }, [editing, open, portfolios]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      portfolioId: formData.get("portfolioId"),
      address: formData.get("address"),
      propertyType: formData.get("propertyType") || undefined,
      bedrooms: formData.get("bedrooms")
        ? Number(formData.get("bedrooms"))
        : undefined,
      purchasePrice: formData.get("purchasePrice")
        ? Number(formData.get("purchasePrice"))
        : undefined,
      purchaseDate: formData.get("purchaseDate") || undefined,
      currentValue: formData.get("currentValue")
        ? Number(formData.get("currentValue"))
        : undefined,
      occupancyStatus: formData.get("occupancyStatus") || undefined,
      estateAgentId: estateAgentId || undefined,
      notes: formData.get("notes") || undefined,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/properties/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: payload.address,
            propertyType: payload.propertyType,
            bedrooms: payload.bedrooms,
            purchasePrice: payload.purchasePrice,
            purchaseDate: payload.purchaseDate,
            currentValue: payload.currentValue,
            occupancyStatus: payload.occupancyStatus,
            estateAgentId: payload.estateAgentId ?? null,
            notes: payload.notes,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.address?.[0] || "Failed to update");
          return;
        }
      } else {
        if (!payload.portfolioId) {
          setError("Please select a portfolio");
          return;
        }
        const res = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.address?.[0] || d.error || "Failed to create");
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
    if (!confirm("Are you sure you want to delete this property?")) return;
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProperties((p) => p.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(p: Property) {
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
          {isOwner && (
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add property
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit property" : "Add property"}</DialogTitle>
            </DialogHeader>
            <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!editing && isOwner && (
                <div className="space-y-2">
                  <Label htmlFor="portfolioId">Portfolio</Label>
                  <Select
                    name="portfolioId"
                    value={portfolioId}
                    onValueChange={(v) => setPortfolioId(v ?? "")}
                  >
                    <SelectTrigger id="portfolioId" className="h-9 w-full">
                      <SelectValue placeholder="Portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isOwner && (
                <div className="space-y-2">
                  <Label htmlFor="estateAgentId">Estate Agent</Label>
                  <Select
                    value={estateAgentId ?? "none"}
                    onValueChange={(v) => setEstateAgentId(v === "none" ? null : v)}
                  >
                    <SelectTrigger id="estateAgentId" className="h-9 w-full">
                      <SelectValue placeholder="Select agent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {estateAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a.company ? `(${a.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  required
                  defaultValue={editing?.address}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Type</Label>
                  <Select
                    name="propertyType"
                    value={propertyType}
                    onValueChange={(v) => setPropertyType(v ?? "")}
                  >
                    <SelectTrigger id="propertyType" className="h-9 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="HMO">HMO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min={0}
                    defaultValue={editing?.bedrooms ?? ""}
                    placeholder="-"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase price (£)</Label>
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    min={0}
                    defaultValue={editing?.purchasePrice ?? ""}
                    placeholder="-"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current value (£)</Label>
                  <Input
                    id="currentValue"
                    name="currentValue"
                    type="number"
                    min={0}
                    defaultValue={editing?.currentValue ?? ""}
                    placeholder="-"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupancyStatus">Occupancy</Label>
                <Select
                  name="occupancyStatus"
                  value={occupancyStatus}
                  onValueChange={(v) => setOccupancyStatus(v ?? "vacant")}
                >
                  <SelectTrigger id="occupancyStatus" className="h-9 w-full">
                    <SelectValue placeholder="Occupancy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={editing?.notes ?? ""}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-2">
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

      {properties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No properties yet. Click &quot;Add property&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bedrooms</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead>Portfolio</TableHead>
                {isOwner && <TableHead>Estate Agent</TableHead>}
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.address}</TableCell>
                  <TableCell>{p.propertyType ?? "-"}</TableCell>
                  <TableCell>{p.bedrooms ?? "-"}</TableCell>
                  <TableCell className="capitalize">
                    {p.occupancyStatus ?? "-"}
                  </TableCell>
                  <TableCell>{p.portfolio?.name ?? "-"}</TableCell>
                  {isOwner && (
                    <TableCell>{p.estateAgent?.name ?? "-"}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
