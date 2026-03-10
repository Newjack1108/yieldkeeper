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

type LandlordCompany = {
  id: string;
  name: string;
  registrationNumber: string;
  address: string | null;
  propertyCount: number;
};

export function LandlordCompaniesPageClient({
  initialCompanies,
}: {
  initialCompanies: LandlordCompany[];
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanies);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LandlordCompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setRegistrationNumber(editing.registrationNumber);
      setAddress(editing.address ?? "");
    } else {
      setName("");
      setRegistrationNumber("");
      setAddress("");
    }
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editing) {
        const res = await fetch(`/api/landlord-companies/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            registrationNumber,
            address: address || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to update");
          return;
        }
      } else {
        const res = await fetch("/api/landlord-companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            registrationNumber,
            address: address || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to create");
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
    const company = companies.find((c) => c.id === id);
    if (
      !confirm(
        company?.propertyCount
          ? `This company has ${company.propertyCount} property(ies) assigned. Unassign them first, or delete will fail. Continue?`
          : "Are you sure you want to delete this company?"
      )
    )
      return;
    const res = await fetch(`/api/landlord-companies/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCompanies((c) => c.filter((x) => x.id !== id));
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to delete");
    }
  }

  function openEdit(c: LandlordCompany) {
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
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit company" : "Add landlord company"}
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
              <div className="space-y-2">
                <Label htmlFor="name">Company name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My BTL Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration number</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Business Street, London"
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

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No landlord companies yet. Click &quot;Add Company&quot; to create one,
          then assign it to properties in the Properties section.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration number</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.registrationNumber}</TableCell>
                  <TableCell>{c.address ?? "-"}</TableCell>
                  <TableCell>{c.propertyCount}</TableCell>
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
