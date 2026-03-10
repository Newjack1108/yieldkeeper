"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  AlertCircle,
  MessageSquare,
  Banknote,
  FileText,
  Wrench,
  Activity,
  Plus,
  ExternalLink,
  Users,
  Send,
  Copy,
} from "lucide-react";
import { SendSmsDialog } from "@/components/sms/send-sms-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TenantProfile } from "@/lib/tenant-profile";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  tenancy_agreement: "Tenancy agreement",
  certificate: "Certificate",
  invoice: "Invoice",
  insurance: "Insurance",
  mortgage: "Mortgage",
  inspection_photo: "Inspection photo",
  other: "Other",
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  rent_reminder: "Rent reminder",
  overdue_alert: "Overdue alert",
  inspection_request: "Inspection request",
  maintenance_ack: "Maintenance ack",
  maintenance_complete: "Maintenance complete",
  custom: "Custom",
};

const ACTIVITY_NOTE_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  note: "Note",
  email: "Email",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  partner: "Partner",
  spouse: "Spouse",
  sibling: "Sibling",
  parent: "Parent",
  child: "Child",
  roommate: "Roommate",
  lodger: "Lodger",
  other: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

type ActivityItem =
  | { type: "rent_payment"; date: string; data: TenantProfile["tenancies"][0]["rentPayments"][0]; tenancy?: TenantProfile["tenancies"][0] }
  | { type: "sms"; date: string; data: TenantProfile["smsLogs"][0] }
  | { type: "document"; date: string; data: TenantProfile["documents"][0] }
  | { type: "maintenance"; date: string; data: TenantProfile["tenancies"][0]["maintenanceItems"][0] }
  | { type: "inspection"; date: string; data: TenantProfile["tenancies"][0]["inspections"][0] }
  | { type: "note"; date: string; data: TenantProfile["activityNotes"][0] };

function buildActivityTimeline(profile: TenantProfile): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const t of profile.tenancies) {
    for (const p of t.rentPayments) {
      items.push({
        type: "rent_payment",
        date: p.paidDate,
        data: p,
        tenancy: t,
      });
    }
    for (const m of t.maintenanceItems) {
      items.push({ type: "maintenance", date: m.reportedDate.slice(0, 10), data: m });
    }
    for (const i of t.inspections) {
      const d = i.completedDate ?? i.scheduledDate ?? "";
      if (d) {
        items.push({ type: "inspection", date: d, data: i });
      }
    }
  }
  for (const s of profile.smsLogs) {
    items.push({ type: "sms", date: s.sentAt, data: s });
  }
  for (const d of profile.documents) {
    items.push({ type: "document", date: d.uploadedAt, data: d });
  }
  for (const n of profile.activityNotes) {
    items.push({ type: "note", date: n.createdAt, data: n });
  }
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

type SmsTemplate = { id: string; type: string; content: string; isActive: boolean };

export function TenantProfileClient({
  initialProfile,
  templates = [],
  smsConfig = { testMode: false },
  smsContext = { address: "", amount: "" },
  canInvite = false,
  canResendInvite = false,
}: {
  initialProfile: TenantProfile;
  templates?: SmsTemplate[];
  smsConfig?: { testMode: boolean };
  smsContext?: { address: string; amount: string };
  canInvite?: boolean;
  canResendInvite?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [sendSmsOpen, setSendSmsOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [occupantOpen, setOccupantOpen] = useState(false);
  const [occupantTenancyId, setOccupantTenancyId] = useState<string | null>(null);
  const [editingOccupant, setEditingOccupant] = useState<{
    id: string;
    name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenant = profile.tenant;
  const activityItems = buildActivityTimeline(profile);
  const totalArrears = profile.tenancies.reduce((sum, t) => sum + t.arrears, 0);
  const allRentPayments = profile.tenancies.flatMap((t) =>
    t.rentPayments.map((p) => ({ ...p, tenancy: t }))
  );
  const allMaintenance = profile.tenancies.flatMap((t) => t.maintenanceItems);

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.name?.[0] || "Failed to update");
        return;
      }
      const updated = await res.json();
      setProfile((p) => ({ ...p, tenant: { ...p.tenant, ...updated } }));
      setEditOpen(false);
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get("content") as string;
    const type = (formData.get("type") as string) || undefined;
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/activity-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: type || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.content?.[0] || "Failed to add note");
        return;
      }
      const note = await res.json();
      setProfile((p) => ({
        ...p,
        activityNotes: [note, ...p.activityNotes],
      }));
      setNoteOpen(false);
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function openOccupantDialog(
    tenancyId: string,
    occupant: {
      id: string;
      name: string;
      relationship: string;
      phone: string | null;
      email: string | null;
      notes: string | null;
    } | null
  ) {
    setOccupantTenancyId(tenancyId);
    setEditingOccupant(occupant);
    setOccupantOpen(true);
    setError(null);
  }

  function closeOccupantDialog() {
    setOccupantOpen(false);
    setOccupantTenancyId(null);
    setEditingOccupant(null);
    setError(null);
  }

  async function handleOccupantSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!occupantTenancyId) return;
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name") as string,
      relationship: formData.get("relationship") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };
    try {
      if (editingOccupant) {
        const res = await fetch(
          `/api/tenancies/${occupantTenancyId}/occupants/${editingOccupant.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.name?.[0] || "Failed to update");
          return;
        }
        const updated = await res.json();
        setProfile((p) => ({
          ...p,
          tenancies: p.tenancies.map((t) =>
            t.id === occupantTenancyId
              ? {
                  ...t,
                  occupants: t.occupants.map((o) =>
                    o.id === editingOccupant.id ? updated : o
                  ),
                }
              : t
          ),
        }));
      } else {
        const res = await fetch(
          `/api/tenancies/${occupantTenancyId}/occupants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const d = await res.json();
          setError(d.error?.name?.[0] || "Failed to add");
          return;
        }
        const occupant = await res.json();
        setProfile((p) => ({
          ...p,
          tenancies: p.tenancies.map((t) =>
            t.id === occupantTenancyId
              ? {
                  ...t,
                  occupants: [...(t.occupants || []), occupant],
                }
              : t
          ),
        }));
      }
      closeOccupantDialog();
      form.reset();
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOccupant(tenancyId: string, occupantId: string) {
    if (!confirm("Remove this occupant?")) return;
    const res = await fetch(
      `/api/tenancies/${tenancyId}/occupants/${occupantId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setProfile((p) => ({
        ...p,
        tenancies: p.tenancies.map((t) =>
          t.id === tenancyId
            ? {
                ...t,
                occupants: (t.occupants || []).filter((o) => o.id !== occupantId),
              }
            : t
        ),
      }));
      router.refresh();
    }
  }

  async function handleInviteToPortal() {
    setInviteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/invite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create invite");
        return;
      }
      setInviteLinkUrl(data.setPasswordUrl ?? null);
      setInviteLinkOpen(true);
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLinkUrl) return;
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
    } catch {
      setError("Failed to copy");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tenants">
          <Button variant="ghost" size="icon" type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm">Tenant profile</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Contact details</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm">
                {tenant.email && (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${tenant.email}`} className="text-primary hover:underline">
                      {tenant.email}
                    </a>
                  </span>
                )}
                {tenant.phone && (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${tenant.phone}`} className="text-primary hover:underline">
                      {tenant.phone}
                    </a>
                  </span>
                )}
                {tenant.emergencyContact && (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.emergencyContact}</span>
                  </span>
                )}
              </div>
              {tenant.notes && (
                <p className="text-sm text-muted-foreground mt-2">{tenant.notes}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tenant.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSendSmsOpen(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send SMS
                </Button>
              )}
              {!tenant.phone && (
                <span className="text-xs text-muted-foreground">
                  No phone on file — add one to send SMS
                </span>
              )}
              {(canInvite || canResendInvite) && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleInviteToPortal}
                  disabled={inviteLoading}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {inviteLoading
                    ? "Sending..."
                    : canResendInvite
                      ? "Resend invite"
                      : "Invite to portal"}
                </Button>
              )}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger>
                  <Button variant="outline" size="sm" type="button">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit tenant</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" required defaultValue={tenant.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={tenant.email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={tenant.phone ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency contact</Label>
                    <Input
                      id="emergencyContact"
                      name="emergencyContact"
                      defaultValue={tenant.emergencyContact ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      name="notes"
                      defaultValue={tenant.notes ?? ""}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Update"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog
              open={occupantOpen}
              onOpenChange={(v) => (v ? null : closeOccupantDialog())}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingOccupant ? "Edit occupant" : "Add occupant"}
                  </DialogTitle>
                </DialogHeader>
                <form
                  key={editingOccupant?.id ?? "new"}
                  onSubmit={handleOccupantSubmit}
                  className="space-y-4"
                >
                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="occupantName">Name</Label>
                    <Input
                      id="occupantName"
                      name="name"
                      required
                      defaultValue={editingOccupant?.name ?? ""}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupantRelationship">Relationship</Label>
                    <select
                      id="occupantRelationship"
                      name="relationship"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      defaultValue={editingOccupant?.relationship ?? ""}
                    >
                      <option value="">Select</option>
                      {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupantPhone">Phone</Label>
                    <Input
                      id="occupantPhone"
                      name="phone"
                      type="tel"
                      defaultValue={editingOccupant?.phone ?? ""}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupantEmail">Email</Label>
                    <Input
                      id="occupantEmail"
                      name="email"
                      type="email"
                      defaultValue={editingOccupant?.email ?? ""}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupantNotes">Notes</Label>
                    <Input
                      id="occupantNotes"
                      name="notes"
                      defaultValue={editingOccupant?.notes ?? ""}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeOccupantDialog}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading
                        ? "Saving..."
                        : editingOccupant
                          ? "Update"
                          : "Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={inviteLinkOpen} onOpenChange={setInviteLinkOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Share invite link</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Share this link with your tenant to set their password. It expires in 7 days.
                </p>
                {inviteLinkUrl && (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteLinkUrl}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={copyInviteLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button onClick={() => setInviteLinkOpen(false)}>
                  Close
                </Button>
              </DialogContent>
            </Dialog>
            <SendSmsDialog
              open={sendSmsOpen}
              onOpenChange={setSendSmsOpen}
              tenantId={tenant.id}
              tenantName={tenant.name}
              address={smsContext.address}
              amount={smsContext.amount}
              templates={templates}
              smsConfig={smsConfig}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
        </CardHeader>
        {totalArrears > 0 && (
          <CardContent className="pt-0">
            <Badge variant="destructive">Arrears: {formatCurrency(totalArrears)}</Badge>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rent">Rent payments</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current tenancies</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.tenancies.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tenancies</p>
              ) : (
                <div className="space-y-3">
                  {profile.tenancies.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border p-4 space-y-4"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">
                            {t.property.address}
                            {t.unit ? ` – ${t.unit.unitLabel}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(t.rentAmount)}/{t.rentFrequency} – {t.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.startDate)} – {t.endDate ? formatDate(t.endDate) : "Ongoing"}
                          </p>
                        </div>
                        {t.arrears > 0 && (
                          <Badge variant="destructive">
                            Arrears: {formatCurrency(t.arrears)}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Declared occupants
                        </p>
                        {(t.occupants?.length ?? 0) === 0 ? (
                          <p className="text-muted-foreground text-sm mb-2">
                            No occupants declared
                          </p>
                        ) : (
                          <ul className="space-y-1 mb-2">
                            {t.occupants.map((o) => (
                              <li
                                key={o.id}
                                className="flex items-center justify-between gap-2 text-sm py-1"
                              >
                                <span>
                                  {o.name}
                                  <span className="text-muted-foreground ml-1">
                                    ({RELATIONSHIP_LABELS[o.relationship] ?? o.relationship})
                                  </span>
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      openOccupantDialog(t.id, {
                                        id: o.id,
                                        name: o.name,
                                        relationship: o.relationship,
                                        phone: o.phone,
                                        email: o.email,
                                        notes: o.notes,
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleDeleteOccupant(t.id, o.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOccupantDialog(t.id, null)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add occupant
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rent payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {allRentPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No payments recorded</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRentPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.paidDate)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell>{p.method ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.tenancy.property.address}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {p.notes ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS messages</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.smsLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No messages</p>
              ) : (
                <div className="space-y-3">
                  {profile.smsLogs.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant={s.direction === "outbound" ? "default" : "secondary"}>
                          {s.direction}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(s.sentAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {MESSAGE_TYPE_LABELS[s.messageType] ?? s.messageType} → {s.toPhone}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No documents</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.documents.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.filename}</TableCell>
                          <TableCell>
                            {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(d.uploadedAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => window.open(d.url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance requests</CardTitle>
            </CardHeader>
            <CardContent>
              {allMaintenance.length === 0 ? (
                <p className="text-muted-foreground text-sm">No maintenance requests</p>
              ) : (
                <div className="space-y-3">
                  {allMaintenance.map((m) => (
                    <div key={m.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-medium">{m.title}</p>
                        <Badge variant={m.priority === "urgent" || m.priority === "emergency" ? "destructive" : "secondary"}>
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {m.property?.address ?? "—"} · Reported {formatDate(m.reportedDate.slice(0, 10))}
                      </p>
                      {m.description && (
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Activity timeline</CardTitle>
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogTrigger>
                  <Button size="sm" type="button">
                    <Plus className="mr-2 h-4 w-4" />
                    Add note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add activity note</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    {error && (
                      <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="content">Note</Label>
                      <Input
                        id="content"
                        name="content"
                        required
                        placeholder="e.g. Spoke with tenant about..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="noteType">Type</Label>
                      <select
                        id="noteType"
                        name="type"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">General</option>
                        {Object.entries(ACTIVITY_NOTE_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Add"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {activityItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet</p>
              ) : (
                <div className="relative space-y-0">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  {activityItems.map((item) => (
                    <div key={`${item.type}-${item.data.id}`} className="relative pl-10 pb-6">
                      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                        {item.type === "rent_payment" && <Banknote className="h-4 w-4 text-green-600" />}
                        {item.type === "sms" && <MessageSquare className="h-4 w-4 text-blue-600" />}
                        {item.type === "document" && <FileText className="h-4 w-4 text-amber-600" />}
                        {item.type === "maintenance" && <Wrench className="h-4 w-4 text-orange-600" />}
                        {item.type === "inspection" && <Activity className="h-4 w-4 text-violet-600" />}
                        {item.type === "note" && <Activity className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.date.includes("T")
                            ? formatDateTime(item.date)
                            : formatDate(item.date)}
                        </p>
                        {item.type === "rent_payment" && (
                          <p>
                            Rent payment: {formatCurrency((item.data as { amount: number }).amount)}
                            {" – "}{(item as { tenancy?: { property: { address: string } } }).tenancy?.property.address ?? ""}
                          </p>
                        )}
                        {item.type === "sms" && (
                          <p className="truncate">{(item.data as { body: string }).body}</p>
                        )}
                        {item.type === "document" && (
                          <p>Document: {(item.data as { filename: string }).filename}</p>
                        )}
                        {item.type === "maintenance" && (
                          <p>Maintenance: {(item.data as { title: string }).title}</p>
                        )}
                        {item.type === "inspection" && (
                          <p>Inspection: {(item.data as { type: string }).type}</p>
                        )}
                        {item.type === "note" && (
                          <p>{(item.data as { content: string }).content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
