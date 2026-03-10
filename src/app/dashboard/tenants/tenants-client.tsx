"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User } from "lucide-react";
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

type Tenant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  emergencyContact: string | null;
  notes: string | null;
};

export function TenantsPageClient({
  initialTenants,
}: {
  initialTenants: Tenant[];
}) {
  const router = useRouter();
  const [tenants, setTenants] = useState(initialTenants);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenants(initialTenants);
  }, [initialTenants]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      emergencyContact: formData.get("emergencyContact") || undefined,
      notes: formData.get("notes") || undefined,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/tenants/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.name?.[0] || "Failed to update");
          return;
        }
      } else {
        if (!payload.name) {
          setError("Name is required");
          return;
        }
        const res = await fetch("/api/tenants", {
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
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this tenant?")) return;
    const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTenants((t) => t.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(t: Tenant) {
    setEditing(t);
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
              Add tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit tenant" : "Add tenant"}</DialogTitle>
            </DialogHeader>
            <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name}
                  placeholder="Tenant full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editing?.email ?? ""}
                  placeholder="tenant@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editing?.phone ?? ""}
                  placeholder="+44 7700 900123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency contact</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  defaultValue={editing?.emergencyContact ?? ""}
                  placeholder="Name and phone"
                />
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

      {tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No tenants yet. Click &quot;Add tenant&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/tenants/${t.id}`}
                      className="hover:underline text-primary"
                    >
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell>{t.email ?? "-"}</TableCell>
                  <TableCell>{t.phone ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/dashboard/tenants/${t.id}`}>
                        <Button variant="ghost" size="icon-sm" type="button">
                          <User className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(t.id)}
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
