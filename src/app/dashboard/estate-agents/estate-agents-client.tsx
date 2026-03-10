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

type EstateAgent = {
  id: string;
  userId: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  userEmail: string;
  userName: string | null;
  propertyCount: number;
  createdAt?: string;
};

export function EstateAgentsPageClient({
  initialAgents,
}: {
  initialAgents: EstateAgent[];
}) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EstateAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCompany(editing.company ?? "");
      setEmail(editing.email);
      setPhone(editing.phone ?? "");
      setNotes(editing.notes ?? "");
      setPassword("");
    } else {
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setPassword("");
      setNotes("");
    }
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editing) {
        const res = await fetch(`/api/estate-agents/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            company: company || undefined,
            email,
            phone: phone || undefined,
            notes: notes || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.email?.[0] || d.error || "Failed to update");
          return;
        }
      } else {
        if (!name || !email || !password) {
          setError("Name, email and password are required");
          return;
        }
        const res = await fetch("/api/estate-agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            company: company || undefined,
            email,
            phone: phone || undefined,
            password,
            notes: notes || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.email?.[0] || d.error || "Failed to create");
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
    if (
      !confirm(
        "Are you sure? This will remove the agent from all properties and delete their account."
      )
    )
      return;
    const res = await fetch(`/api/estate-agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAgents((a) => a.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  function openEdit(a: EstateAgent) {
    setEditing(a);
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
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit estate agent" : "Add estate agent"}
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
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ABC Estate Agents"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@example.com"
                  disabled={!!editing}
                />
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                )}
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
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required={!editing}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters. Share securely with the agent.
                  </p>
                </div>
              )}
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
                  {loading
                    ? "Saving..."
                    : editing
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No estate agents yet. Click &quot;Add Agent&quot; to create one, then
          assign them to properties in the Properties section.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.company ?? "-"}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.phone ?? "-"}</TableCell>
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
