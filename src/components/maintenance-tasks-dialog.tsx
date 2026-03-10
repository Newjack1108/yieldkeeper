"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

const TASK_TYPES = [
  { value: "window_cleaning", label: "Window cleaning" },
  { value: "grass_cutting", label: "Grass cutting" },
  { value: "gutter_cleanout", label: "Gutter cleanout" },
  { value: "patio_cleaning", label: "Patio cleaning" },
  { value: "fence_repair", label: "Fence repair" },
  { value: "other", label: "Other" },
];

type Task = {
  id: string;
  taskType: string;
  name: string;
  price: number;
  enabled: boolean;
};

export function MaintenanceTasksDialog({
  propertyId,
  propertyAddress,
  open,
  onOpenChange,
}: {
  propertyId: string;
  propertyAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; price: number }>({
    name: "",
    price: 0,
  });
  const [taskType, setTaskType] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && propertyId) {
      setLoading(true);
      fetch(`/api/properties/${propertyId}/maintenance-tasks`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTasks(
              data.map((t: { id: string; taskType: string; name: string; price: number; enabled: boolean }) => ({
                id: t.id,
                taskType: t.taskType,
                name: t.name,
                price: t.price,
                enabled: t.enabled,
              }))
            );
          } else {
            setTasks([]);
          }
        })
        .catch(() => setTasks([]))
        .finally(() => setLoading(false));
    }
  }, [open, propertyId]);

  function resetForm() {
    setTaskType("");
    setName("");
    setPrice("");
    setEnabled(true);
    setEditingId(null);
    setAddOpen(false);
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/maintenance-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          name: name || (TASK_TYPES.find((t) => t.value === taskType)?.label ?? taskType),
          price: Number(price) || 0,
          enabled,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.taskType?.[0] ?? d.error ?? "Failed to add");
        return;
      }
      resetForm();
      router.refresh();
      const created = await res.json();
      setTasks((prev) => [
        ...prev,
        {
          id: created.id,
          taskType: created.taskType,
          name: created.name,
          price: created.price,
          enabled: created.enabled,
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(taskId: string, payload: { name?: string; price?: number; enabled?: boolean }) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/maintenance-tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to update");
        return;
      }
      setEditingId(null);
      router.refresh();
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditDraft({ name: task.name, price: task.price });
  }

  function saveEditing(taskId: string) {
    handleUpdate(taskId, {
      name: editDraft.name,
      price: editDraft.price,
    });
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Remove this maintenance task?")) return;
    const res = await fetch(
      `/api/properties/${propertyId}/maintenance-tasks/${taskId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleToggleEnabled(task: Task) {
    const res = await fetch(
      `/api/properties/${propertyId}/maintenance-tasks/${task.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !task.enabled }),
      }
    );
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, enabled: !t.enabled } : t
        )
      );
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance tasks – {propertyAddress}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Configure tasks tenants can request and pay for (window cleaning, grass
          cutting, etc.)
        </p>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddOpen(true);
                  setTaskType("");
                  setName("");
                  setPrice("");
                  setEnabled(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            </div>
            {addOpen && (
              <form onSubmit={handleAdd} className="space-y-3 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Task type</Label>
                    <Select
                      value={taskType}
                      onValueChange={(v) => {
                        const val = v ?? "";
                        setTaskType(val);
                        if (!name) setName(TASK_TYPES.find((t) => t.value === val)?.label ?? val);
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.filter(
                          (t) => !tasks.some((x) => x.taskType === t.value)
                        ).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                        {TASK_TYPES.filter((t) => tasks.some((x) => x.taskType === t.value))
                          .length === TASK_TYPES.length && (
                          <SelectItem value="other" disabled>
                            All types added
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (£)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Window cleaning"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                  <Label htmlFor="enabled">Available for tenant requests</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {tasks.length === 0 && !addOpen ? (
              <p className="py-6 text-center text-muted-foreground">
                No maintenance tasks. Add one to let tenants request and pay for
                services.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          {editingId === task.id ? (
                            <Input
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((p) => ({ ...p, name: e.target.value }))
                              }
                              onBlur={() => saveEditing(task.id)}
                            />
                          ) : (
                            task.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === task.id ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={editDraft.price}
                              onChange={(e) =>
                                setEditDraft((p) => ({
                                  ...p,
                                  price: Number(e.target.value),
                                }))
                              }
                              onBlur={() => saveEditing(task.id)}
                            />
                          ) : (
                            `£${task.price.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={task.enabled}
                            onCheckedChange={() => handleToggleEnabled(task)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                editingId === task.id
                                  ? saveEditing(task.id)
                                  : startEditing(task)
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(task.id)}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
