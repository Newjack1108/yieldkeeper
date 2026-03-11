"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { ArrowLeft, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { INSPECTION_ROOM_TEMPLATE } from "@/lib/checklists";

type InspectionPhoto = {
  id: string;
  url: string;
  caption: string | null;
  inspectionItemId?: string | null;
};

type InspectionItemPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

type RoomSection = {
  id?: string;
  roomName: string;
  conditionRating: number | null;
  notes: string | null;
  existingPhotos: InspectionItemPhoto[];
  newPhotos: { url: string; filename: string }[];
};

type InspectionAction = {
  id: string;
  description: string;
  dueDate: string | null;
  completedDate: string | null;
  status: string;
};

type Inspection = {
  id: string;
  propertyId: string;
  property: { id: string; address: string };
  tenancyId: string | null;
  tenancy: {
    id: string;
    tenant: { id: string; name: string; phone: string | null };
  } | null;
  type: string;
  scheduledDate: string | null;
  completedDate: string | null;
  inspector: string | null;
  nextDueDate: string | null;
  overallRating: number | null;
  status: string;
  items: {
    id: string;
    roomName: string;
    conditionRating: number | null;
    notes: string | null;
    photos: InspectionItemPhoto[];
  }[];
  photos: InspectionPhoto[];
  actions: InspectionAction[];
};

export function InspectionSheetClient({
  inspection: initialInspection,
}: {
  inspection: Inspection;
}) {
  const router = useRouter();
  const [inspection, setInspection] = useState(initialInspection);
  const [sections, setSections] = useState<RoomSection[]>(() =>
    initialInspection.items.map((item) => ({
      id: item.id,
      roomName: item.roomName,
      conditionRating: item.conditionRating,
      notes: item.notes,
      existingPhotos: item.photos,
      newPhotos: [] as { url: string; filename: string }[],
    }))
  );
  const [inspector, setInspector] = useState(initialInspection.inspector ?? "");
  const [overallRating, setOverallRating] = useState(
    initialInspection.overallRating != null
      ? String(initialInspection.overallRating)
      : ""
  );
  const [completedDate, setCompletedDate] = useState(
    initialInspection.completedDate ?? ""
  );
  const [nextDueDate, setNextDueDate] = useState(
    initialInspection.nextDueDate ?? ""
  );
  const [actions, setActions] = useState<InspectionAction[]>(
    initialInspection.actions
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [addActionLoading, setAddActionLoading] = useState(false);
  const [addActionStatus, setAddActionStatus] = useState("pending");

  const usedTemplateRooms = sections.map((s) => s.roomName);
  const nextTemplateRoom = INSPECTION_ROOM_TEMPLATE.find(
    (r) => !usedTemplateRooms.includes(r)
  );

  const addRoomFromTemplate = useCallback(() => {
    if (!nextTemplateRoom) return;
    setSections((prev) => [
      ...prev,
      {
        roomName: nextTemplateRoom,
        conditionRating: null,
        notes: null,
        existingPhotos: [],
        newPhotos: [],
      },
    ]);
  }, [nextTemplateRoom]);

  const addCustomRoom = useCallback(() => {
    setSections((prev) => [
      ...prev,
      {
        roomName: "",
        conditionRating: null,
        notes: null,
        existingPhotos: [],
        newPhotos: [],
      },
    ]);
  }, []);

  const updateSection = useCallback(
    (index: number, updates: Partial<RoomSection>) => {
      setSections((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const removeSection = useCallback((index: number) => {
    const section = sections[index];
    if (section?.id) {
      fetch(
        `/api/inspections/${inspection.id}/items/${section.id}`,
        { method: "DELETE" }
      ).then((res) => res.ok && router.refresh());
    }
    setSections((prev) => prev.filter((_, i) => i !== index));
  }, [inspection.id, sections, router]);

  const addPhotoToSection = useCallback(
    (index: number, url: string, filename: string) => {
      setSections((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                newPhotos:
                  s.newPhotos.length < 5
                    ? [...s.newPhotos, { url, filename }]
                    : s.newPhotos,
              }
            : s
        )
      );
    },
    []
  );

  const removeNewPhoto = useCallback(
    (sectionIndex: number, photoIndex: number) => {
      setSections((prev) =>
        prev.map((s, i) =>
          i === sectionIndex
            ? {
                ...s,
                newPhotos: s.newPhotos.filter((_, pi) => pi !== photoIndex),
              }
            : s
        )
      );
    },
    []
  );

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      // 1. PATCH inspection
      const patchRes = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspector: inspector || null,
          overallRating: overallRating ? Number(overallRating) : null,
          completedDate: completedDate || null,
          nextDueDate: nextDueDate || null,
        }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json();
        setError(d.error ?? "Failed to update inspection");
        return;
      }

      // 2. Create/update items and photos
      for (const section of sections) {
        let itemId: string;

        if (section.id) {
          const patchItemRes = await fetch(
            `/api/inspections/${inspection.id}/items/${section.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomName: section.roomName,
                conditionRating: section.conditionRating,
                notes: section.notes || null,
              }),
            }
          );
          if (!patchItemRes.ok) {
            setError("Failed to update room");
            return;
          }
          itemId = section.id;
        } else {
          if (!section.roomName.trim()) continue;
          const postItemRes = await fetch(
            `/api/inspections/${inspection.id}/items`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomName: section.roomName,
                conditionRating: section.conditionRating,
                notes: section.notes || null,
              }),
            }
          );
          if (!postItemRes.ok) {
            setError("Failed to add room");
            return;
          }
          const newItem = await postItemRes.json();
          itemId = newItem.id;
        }

        for (const photo of section.newPhotos) {
          const photoRes = await fetch(
            `/api/inspections/${inspection.id}/photos`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: photo.url,
                caption: null,
                inspectionItemId: itemId,
              }),
            }
          );
          if (!photoRes.ok) {
            setError("Failed to upload photo");
            return;
          }
        }
      }

      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkCompleted() {
    setCompletedDate(new Date().toISOString().slice(0, 10));
    setInspection((prev) => ({
      ...prev,
      status: "completed",
      completedDate: new Date().toISOString().slice(0, 10),
    }));
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completedDate: new Date().toISOString().slice(0, 10),
          inspector: inspector || null,
          overallRating: overallRating ? Number(overallRating) : null,
          nextDueDate: nextDueDate || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to mark completed");
        return;
      }
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddActionLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      description: formData.get("description"),
      dueDate: formData.get("dueDate") || null,
      completedDate: formData.get("completedDate") || null,
      status: addActionStatus,
    };
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newAction = await res.json();
        setActions((prev) => [
          ...prev,
          {
            id: newAction.id,
            description: newAction.description,
            dueDate: newAction.dueDate?.slice(0, 10) ?? null,
            completedDate: newAction.completedDate?.slice(0, 10) ?? null,
            status: newAction.status ?? "pending",
          },
        ]);
        setAddActionOpen(false);
        setAddActionStatus("pending");
        form.reset();
        router.refresh();
      }
    } finally {
      setAddActionLoading(false);
    }
  }

  useEffect(() => {
    setInspection(initialInspection);
    setSections(
      initialInspection.items.map((item) => ({
        id: item.id,
        roomName: item.roomName,
        conditionRating: item.conditionRating,
        notes: item.notes,
        existingPhotos: item.photos,
        newPhotos: [] as { url: string; filename: string }[],
      }))
    );
    setInspector(initialInspection.inspector ?? "");
    setOverallRating(
      initialInspection.overallRating != null
        ? String(initialInspection.overallRating)
        : ""
    );
    setCompletedDate(initialInspection.completedDate ?? "");
    setNextDueDate(initialInspection.nextDueDate ?? "");
    setActions(initialInspection.actions);
  }, [initialInspection]);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const canUploadPhotos = !!(cloudName && uploadPreset);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard/inspections">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inspections
          </Button>
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inspection sheet</CardTitle>
          <div className="grid gap-2 text-sm">
            <p className="font-medium">{inspection.property.address}</p>
            {inspection.tenancy && (
              <p className="text-muted-foreground">
                Tenant: {inspection.tenancy.tenant.name}
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <span>
                Scheduled: {inspection.scheduledDate ?? "—"}
              </span>
              <div className="flex items-center gap-2">
                <Label htmlFor="inspector" className="text-muted-foreground">
                  Inspector:
                </Label>
                <Input
                  id="inspector"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="Name or company"
                  className="h-8 w-48"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Room sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Rooms / areas</CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRoomFromTemplate}
              disabled={!nextTemplateRoom}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add from template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomRoom}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add custom room
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No rooms added. Add a room from the template or add a custom room.
            </p>
          ) : (
            sections.map((section, index) => (
              <div
                key={section.id ?? `new-${index}`}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Room name</Label>
                      <Input
                        value={section.roomName}
                        onChange={(e) =>
                          updateSection(index, {
                            roomName: e.target.value,
                          })
                        }
                        placeholder="e.g. Kitchen"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Condition (1–5)</Label>
                      <Select
                        value={
                          section.conditionRating != null
                            ? String(section.conditionRating)
                            : ""
                        }
                        onValueChange={(v) =>
                          updateSection(index, {
                            conditionRating: v
                              ? Number(v)
                              : null,
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
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
                    <div className="space-y-1 sm:col-span-2 md:col-span-1">
                      <Label>Notes</Label>
                      <Input
                        value={section.notes ?? ""}
                        onChange={(e) =>
                          updateSection(index, { notes: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeSection(index)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Photos */}
                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="flex flex-wrap gap-3">
                    {section.existingPhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border"
                      >
                        <img
                          src={p.url}
                          alt={p.caption ?? "Photo"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {section.newPhotos.map((img, pi) => (
                      <div
                        key={`${img.url}-${pi}`}
                        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border"
                      >
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(index, pi)}
                          className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {canUploadPhotos && section.newPhotos.length < 5 && (
                      <CldUploadWidget
                        uploadPreset={uploadPreset!}
                        onSuccess={(result: unknown) => {
                          const info = (
                            result as {
                              info?: {
                                secure_url?: string;
                                original_filename?: string;
                              };
                            }
                          )?.info;
                          const url = info?.secure_url;
                          if (url && typeof url === "string") {
                            addPhotoToSection(
                              index,
                              url,
                              info?.original_filename ?? "photo"
                            );
                          }
                        }}
                        options={{
                          resourceType: "image",
                          multiple: true,
                          maxFiles: Math.max(
                            1,
                            5 - section.existingPhotos.length - section.newPhotos.length
                          ),
                        }}
                        config={
                          cloudName
                            ? { cloud: { cloudName } }
                            : undefined
                        }
                      >
                        {({ open }) => (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-20 w-20 shrink-0 flex-col gap-1"
                            onClick={() => open()}
                          >
                            <Upload className="h-6 w-6" />
                            <span className="text-xs">Add photo</span>
                          </Button>
                        )}
                      </CldUploadWidget>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Overall */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="overallRating">Overall rating (1–5)</Label>
            <Select
              value={overallRating}
              onValueChange={(v) => setOverallRating(v ?? "")}
            >
              <SelectTrigger id="overallRating" className="h-9">
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
            <Label htmlFor="completedDate">Completed date</Label>
            <Input
              id="completedDate"
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextDueDate">Next due date</Label>
            <Input
              id="nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Follow-up actions</CardTitle>
          <Dialog open={addActionOpen} onOpenChange={setAddActionOpen}>
            <DialogTrigger>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add follow-up action</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleAddAction}
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
                    <Input id="dueDate" name="dueDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actionStatus">Status</Label>
                    <Select
                      value={addActionStatus}
                      onValueChange={(v) => setAddActionStatus(v ?? "pending")}
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
                  <Label htmlFor="actionCompletedDate">Completed date</Label>
                  <Input id="actionCompletedDate" name="completedDate" type="date" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddActionOpen(false)}
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
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No follow-up actions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {actions.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <span>{a.description}</span>
                  <span className="text-muted-foreground">
                    Due: {a.dueDate ?? "—"} — {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-4">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="outline"
          onClick={handleMarkCompleted}
          disabled={saving || inspection.status === "completed"}
        >
          Mark completed
        </Button>
      </div>
    </div>
  );
}
