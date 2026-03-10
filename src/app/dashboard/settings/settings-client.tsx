"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  HandCoins,
  MessageSquare,
  Pencil,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  rent_reminder: "Rent reminder",
  overdue_alert: "Overdue alert",
  inspection_request: "Inspection request",
  maintenance_ack: "Maintenance ack",
  maintenance_complete: "Maintenance complete",
  custom: "Custom",
};

function formatTemplateLabel(type: string): string {
  if (MESSAGE_TYPE_LABELS[type]) return MESSAGE_TYPE_LABELS[type];
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type Template = {
  id: string;
  type: string;
  content: string;
  isActive: boolean;
};

export function SettingsPageClient({
  user,
  initialTemplates,
  lettingAgentCount,
  landlordCompanyCount,
}: {
  user: { id: string; email: string; name: string | null };
  initialTemplates: Template[];
  lettingAgentCount: number;
  landlordCompanyCount: number;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [addName, setAddName] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  function openEditDialog(template: Template) {
    setEditingTemplate(template);
    setEditContent(template.content);
    setEditActive(template.isActive);
    setError(null);
    setEditOpen(true);
  }

  function openAddDialog() {
    setAddName("");
    setAddContent("");
    setAddActive(true);
    setError(null);
    setAddOpen(true);
  }

  async function handleAddTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          content: addContent.trim(),
          isActive: addActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.name?.[0] ?? data.error ?? "Failed to create");
        return;
      }
      setTemplates((prev) => [...prev, data].sort((a, b) => a.type.localeCompare(b.type)));
      setAddOpen(false);
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/sms/templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent.trim(),
          isActive: editActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.content?.[0] ?? data.error ?? "Failed to update");
        return;
      }
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, content: data.content, isActive: data.isActive }
            : t
        )
      );
      setEditOpen(false);
      setEditingTemplate(null);
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "templates" || tabParam === "letting" ? tabParam : "account";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="account">
          <User className="mr-2 h-4 w-4" />
          Account
        </TabsTrigger>
        <TabsTrigger value="letting">
          <HandCoins className="mr-2 h-4 w-4" />
          Letting agents & companies
        </TabsTrigger>
        <TabsTrigger value="templates">
          <MessageSquare className="mr-2 h-4 w-4" />
          SMS templates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{user.name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Account editing coming soon.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="letting" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Letting agents & landlord companies</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add letting agents and landlord companies here, then assign them to
              properties when adding or editing a property.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">Letting agents</p>
                  <p className="text-sm text-muted-foreground">
                    {lettingAgentCount} agent
                    {lettingAgentCount !== 1 ? "s" : ""} configured
                  </p>
                </div>
                <Link
                  href="/dashboard/letting-agents"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Manage
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">Landlord companies</p>
                  <p className="text-sm text-muted-foreground">
                    {landlordCompanyCount} compan
                    {landlordCompanyCount !== 1 ? "ies" : "y"}{" "}
                    configured
                  </p>
                </div>
                <Link
                  href="/dashboard/landlord-companies"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Manage
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>SMS templates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Edit the message templates used when sending SMS to tenants.
                  Variables: {"{{tenantName}}"}, {"{{amount}}"}, {"{{address}}"}
                </p>
              </div>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatTemplateLabel(t.type)}
                      </span>
                      {!t.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {t.content}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(t)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    Edit{" "}
                    {editingTemplate ? formatTemplateLabel(editingTemplate.type) : ""}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="content">Message content</Label>
                    <textarea
                      id="content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {editContent.length}/2000 characters
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="isActive">Active (visible in SMS send)</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add template</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddTemplate} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="addName">Template name</Label>
                    <Input
                      id="addName"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. Move out notice"
                      maxLength={64}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to identify this template in the SMS send dropdown
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addContent">Message content</Label>
                    <textarea
                      id="addContent"
                      value={addContent}
                      onChange={(e) => setAddContent(e.target.value)}
                      placeholder="Hi {{tenantName}}. Your message here..."
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{{tenantName}}"}, {"{{amount}}"}, {"{{address}}"} — {addContent.length}/2000 characters
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="addActive"
                      checked={addActive}
                      onChange={(e) => setAddActive(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="addActive">Active (visible in SMS send)</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
