"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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

type InspectionItem = {
  id: string;
  roomName: string;
  conditionRating: number | null;
  notes: string | null;
};

type InspectionAction = {
  id: string;
  description: string;
  dueDate: string | null;
  completedDate: string | null;
  status: string;
};

type InspectionRow = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  tenancyId: string | null;
  tenancy: { id: string; tenant: { id: string; name: string } } | null;
  type: string;
  scheduledDate: string | null;
  completedDate: string | null;
  inspector: string | null;
  nextDueDate: string | null;
  overallRating: number | null;
  status: string;
  items: InspectionItem[];
  actions: InspectionAction[];
};

type Property = { id: string; address: string };
type TenancyOption = { id: string; propertyId: string; label: string };

export function InspectionsPageClient({
  initialInspections,
  properties,
  tenancies,
}: {
  initialInspections: InspectionRow[];
  properties: Property[];
  tenancies: TenancyOption[];
}) {
  const router = useRouter();
  const [inspections, setInspections] = useState(initialInspections);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add item/action dialogs
  const [addItemInspectionId, setAddItemInspectionId] = useState<string | null>(null);
  const [addActionInspectionId, setAddActionInspectionId] = useState<string | null>(null);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addActionLoading, setAddActionLoading] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [tenancyId, setTenancyId] = useState("");
  const [type, setType] = useState("landlord");
  const [overallRating, setOverallRating] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [conditionRating, setConditionRating] = useState("");
  const [actionStatus, setActionStatus] = useState("pending");

  useEffect(() => {
    setInspections(initialInspections);
  }, [initialInspections]);

  useEffect(() => {
    if (editing) {
      setTenancyId(editing.tenancyId ?? "");
      setType(editing.type ?? "landlord");
      setOverallRating(editing.overallRating != null ? String(editing.overallRating) : "");
      setStatus(editing.status ?? "scheduled");
    } else {
      setPropertyId("");
      setTenancyId("");
      setType("landlord");
      setOverallRating("");
      setStatus("scheduled");
    }
  }, [editing, open]);

  useEffect(() => {
    if (!addItemInspectionId) setConditionRating("");
  }, [addItemInspectionId]);

  useEffect(() => {
    if (!addActionInspectionId) setActionStatus("pending");
  }, [addActionInspectionId]);

  const tenanciesForProperty = (propertyId: string) =>
    tenancies.filter((t) => t.propertyId === propertyId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      propertyId: formData.get("propertyId"),
      tenancyId: formData.get("tenancyId") || null,
      type: formData.get("type") || "landlord",
      scheduledDate: formData.get("scheduledDate") || null,
      completedDate: formData.get("completedDate") || null,
      inspector: formData.get("inspector") || null,
      nextDueDate: formData.get("nextDueDate") || null,
      overallRating: formData.get("overallRating")
        ? Number(formData.get("overallRating"))
        : null,
      status: formData.get("status") || "scheduled",
    };

    try {
      if (editing) {
        const res = await fetch(`/api/inspections/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenancyId: payload.tenancyId,
            type: payload.type,
            scheduledDate: payload.scheduledDate,
            completedDate: payload.completedDate,
            inspector: payload.inspector,
            nextDueDate: payload.nextDueDate,
            overallRating: payload.overallRating,
            status: payload.status,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.propertyId?.[0] || "Failed to update");
          return;
        }
      } else {
        if (!payload.propertyId) {
          setError("Please select a property");
          return;
        }
        const res = await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.propertyId?.[0] || d.error || "Failed to create");
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
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    const res = await fetch(`/api/inspections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInspections((prev) => prev.filter((x) => x.id !== id));
      if (expandedId === id) setExpandedId(null);
      router.refresh();
    }
  }

  async function handleAddItem(inspectionId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddItemLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      roomName: formData.get("roomName"),
      conditionRating: formData.get("conditionRating")
        ? Number(formData.get("conditionRating"))
        : null,
      notes: formData.get("notes") || null,
    };
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAddItemInspectionId(null);
        form.reset();
        router.refresh();
      }
    } finally {
      setAddItemLoading(false);
    }
  }

  async function handleAddAction(inspectionId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddActionLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      description: formData.get("description"),
      dueDate: formData.get("dueDate") || null,
      completedDate: formData.get("completedDate") || null,
      status: formData.get("status") || "pending",
    };
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAddActionInspectionId(null);
        form.reset();
        router.refresh();
      }
    } finally {
      setAddActionLoading(false);
    }
  }

  function openEdit(i: InspectionRow) {
    setEditing(i);
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
              Add inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit inspection" : "Add inspection"}</DialogTitle>
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
              {!editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Property</Label>
                    <Select
                      name="propertyId"
                      value={propertyId}
                      onValueChange={(v) => setPropertyId(v ?? "")}
                      items={properties.map((p) => ({ value: p.id, label: p.address }))}
                    >
                      <SelectTrigger id="propertyId" className="h-9 w-full" disabled={properties.length === 0}>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                    <Select
                      name="tenancyId"
                      value={tenancyId}
                      onValueChange={(v) => setTenancyId(v ?? "")}
                      items={[
                        { value: "", label: "None" },
                        ...tenancies.map((t) => ({ value: t.id, label: t.label })),
                      ]}
                    >
                      <SelectTrigger id="tenancyId" className="h-9 w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tenancies.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                  <Select
                    name="tenancyId"
                    value={tenancyId}
                    onValueChange={(v) => setTenancyId(v ?? "")}
                    items={[
                      { value: "", label: "None" },
                      ...tenanciesForProperty(editing.propertyId).map((t) => ({ value: t.id, label: t.label })),
                    ]}
                  >
                    <SelectTrigger id="tenancyId" className="h-9 w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {tenanciesForProperty(editing.propertyId).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" value={type} onValueChange={(v) => setType(v ?? "landlord")}>
                  <SelectTrigger id="type" className="h-9 w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="self">Self</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Scheduled date</Label>
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    defaultValue={editing?.scheduledDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="completedDate">Completed date</Label>
                  <Input
                    id="completedDate"
                    name="completedDate"
                    type="date"
                    defaultValue={editing?.completedDate ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspector">Inspector</Label>
                <Input
                  id="inspector"
                  name="inspector"
                  defaultValue={editing?.inspector ?? ""}
                  placeholder="Name or company"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nextDueDate">Next due date</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                    defaultValue={editing?.nextDueDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overallRating">Overall rating (1–5)</Label>
                  <Select
                    name="overallRating"
                    value={overallRating}
                    onValueChange={(v) => setOverallRating(v ?? "")}
                  >
                    <SelectTrigger id="overallRating" className="h-9 w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" value={status} onValueChange={(v) => setStatus(v ?? "scheduled")}>
                  <SelectTrigger id="status" className="h-9 w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No inspections yet. Click &quot;Add inspection&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((i) => (
                <React.Fragment key={i.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}
                  >
                    <TableCell className="w-[40px]">
                      {expandedId === i.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{i.property.address}</TableCell>
                    <TableCell className="capitalize">{i.type}</TableCell>
                    <TableCell className="capitalize">{i.status}</TableCell>
                    <TableCell>{i.scheduledDate ?? "—"}</TableCell>
                    <TableCell>{i.overallRating ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(i)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(i.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === i.id && (
                    <TableRow key={`${i.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-4">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium">Rooms / areas</p>
                              <Dialog
                                open={addItemInspectionId === i.id}
                                onOpenChange={(v) =>
                                  setAddItemInspectionId(v ? i.id : null)
                                }
                              >
                                <DialogTrigger>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Add room
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add room / area</DialogTitle>
                                  </DialogHeader>
                                  <form
                                    onSubmit={(e) => handleAddItem(i.id, e)}
                                    className="space-y-4"
                                  >
                                    <div className="space-y-2">
                                      <Label htmlFor="roomName">Room name</Label>
                                      <Input
                                        id="roomName"
                                        name="roomName"
                                        required
                                        placeholder="e.g. Kitchen, Lounge"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="conditionRating">Condition (1–5)</Label>
                                      <Select
                                        name="conditionRating"
                                        value={conditionRating}
                                        onValueChange={(v) => setConditionRating(v ?? "")}
                                      >
                                        <SelectTrigger id="conditionRating" className="h-9 w-full">
                                          <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="">—</SelectItem>
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                              {n}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="notes">Notes</Label>
                                      <Input
                                        id="notes"
                                        name="notes"
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setAddItemInspectionId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={addItemLoading}>
                                        {addItemLoading ? "Adding..." : "Add"}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>
                            {i.items.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No rooms added yet.
                              </p>
                            ) : (
                              <ul className="space-y-1 text-sm">
                                {i.items.map((item) => (
                                  <li key={item.id} className="flex justify-between">
                                    <span>{item.roomName}</span>
                                    <span className="text-muted-foreground">
                                      {item.conditionRating ?? "—"}/5
                                      {item.notes ? ` — ${item.notes}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium">Follow-up actions</p>
                              <Dialog
                                open={addActionInspectionId === i.id}
                                onOpenChange={(v) =>
                                  setAddActionInspectionId(v ? i.id : null)
                                }
                              >
                                <DialogTrigger>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Add action
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add follow-up action</DialogTitle>
                                  </DialogHeader>
                                  <form
                                    onSubmit={(e) => handleAddAction(i.id, e)}
                                    className="space-y-4"
                                  >
                                    <div className="space-y-2">
                                      <Label htmlFor="description">Description</Label>
                                      <Input
                                        id="description"
                                        name="description"
                                        required
                                        placeholder="e.g. Replace smoke alarm battery"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="dueDate">Due date</Label>
                                        <Input
                                          id="dueDate"
                                          name="dueDate"
                                          type="date"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="actionStatus">Status</Label>
                                        <Select
                                          name="status"
                                          value={actionStatus}
                                          onValueChange={(v) => setActionStatus(v ?? "pending")}
                                        >
                                          <SelectTrigger id="actionStatus" className="h-9 w-full">
                                            <SelectValue placeholder="Status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="completedDate">Completed date</Label>
                                      <Input
                                        id="completedDate"
                                        name="completedDate"
                                        type="date"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setAddActionInspectionId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={addActionLoading}>
                                        {addActionLoading ? "Adding..." : "Add"}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>
                            {i.actions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No follow-up actions yet.
                              </p>
                            ) : (
                              <ul className="space-y-1 text-sm">
                                {i.actions.map((a) => (
                                  <li key={a.id} className="flex justify-between">
                                    <span>{a.description}</span>
                                    <span className="text-muted-foreground">
                                      Due: {a.dueDate ?? "—"} — {a.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
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
