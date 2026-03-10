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
};

type Portfolio = { id: string; name: string };

export function PropertiesPageClient({
  initialProperties,
  portfolios,
}: {
  initialProperties: Property[];
  portfolios: Portfolio[];
}) {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  useEffect(() => {
    setProperties(initialProperties);
  }, [initialProperties]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const defaultPortfolio = portfolios[0]?.id;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add property
            </Button>
          </DialogTrigger>
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
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="portfolioId">Portfolio</Label>
                  <select
                    id="portfolioId"
                    name="portfolioId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={defaultPortfolio}
                  >
                    {portfolios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="propertyType"
                    name="propertyType"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={editing?.propertyType ?? ""}
                  >
                    <option value="">Select</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                    <option value="HMO">HMO</option>
                  </select>
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
                <select
                  id="occupancyStatus"
                  name="occupancyStatus"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue={editing?.occupancyStatus ?? "vacant"}
                >
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="partial">Partial</option>
                </select>
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
