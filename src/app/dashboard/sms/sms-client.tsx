"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SmsLog = {
  id: string;
  tenantId: string | null;
  propertyId: string | null;
  tenant: { id: string; name: string; phone: string | null } | null;
  toPhone: string;
  messageType: string;
  direction: string;
  body: string;
  status: string | null;
  sentAt: string;
};

type Tenant = {
  id: string;
  name: string;
  phone: string | null;
  address?: string;
  amount?: string;
};
type Template = { id: string; type: string; content: string; isActive: boolean };

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  rent_reminder: "Rent reminder",
  overdue_alert: "Overdue alert",
  inspection_request: "Inspection request",
  maintenance_ack: "Maintenance ack",
  maintenance_complete: "Maintenance complete",
  custom: "Custom",
};

function replaceVars(
  template: string,
  vars: { tenantName?: string; amount?: string; address?: string }
): string {
  let out = template;
  if (vars.tenantName)
    out = out.replace(/\{\{tenantName\}\}/g, vars.tenantName);
  if (vars.amount) out = out.replace(/\{\{amount\}\}/g, vars.amount);
  if (vars.address) out = out.replace(/\{\{address\}\}/g, vars.address);
  return out;
}

export function SmsPageClient({
  initialLogs,
  tenants,
  templates,
  smsConfig,
}: {
  initialLogs: SmsLog[];
  tenants: Tenant[];
  templates: Template[];
  smsConfig: { testMode: boolean; configured: boolean };
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [tenantId, setTenantId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const useCustom = !templateId || selectedTemplate?.type === "custom";

  useEffect(() => {
    if (!useCustom && selectedTemplate && selectedTenant) {
      setCustomBody(
        replaceVars(selectedTemplate.content, {
          tenantName: selectedTenant.name,
          amount: selectedTenant.amount ?? "",
          address: selectedTenant.address ?? "",
        })
      );
    } else if (!templateId) {
      setCustomBody("");
    }
  }, [templateId, tenantId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!tenantId) {
      setError("Please select a tenant");
      return;
    }
    const body = customBody;
    if (!body.trim()) {
      setError("Please enter or select a message");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          messageType: selectedTemplate?.type ?? "custom",
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? data.details ?? "Failed to send");
        return;
      }
      setSuccess(
        data.testMode
          ? "Message logged (test mode — not actually sent)"
          : "Message sent successfully"
      );
      setTenantId("");
      setTemplateId("");
      setCustomBody("");
      router.refresh();
      const logsRes = await fetch("/api/sms/logs?limit=50");
      if (logsRes.ok) {
        const newLogs = await logsRes.json();
        setLogs(newLogs);
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {smsConfig.testMode && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span className="font-medium">Test mode</span>
            <span className="text-sm">
              Twilio credentials not configured. Messages are logged but not
              sent. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
              TWILIO_PHONE_NUMBER to enable real SMS.
            </span>
            <Badge variant="secondary" className="ml-1">
              Simulated
            </Badge>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" />
          Send SMS
        </h2>
        <form onSubmit={handleSend} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant</Label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v ?? "")}>
                <SelectTrigger id="tenantId" className="h-9 w-full">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tenants.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tenants with phone numbers. Add a phone in Tenants.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateId">Template</Label>
              <Select
                value={templateId}
                onValueChange={(v) => {
                  setTemplateId(v ?? "");
                  if (!v) setCustomBody("");
                }}
              >
                <SelectTrigger id="templateId" className="h-9 w-full">
                  <SelectValue placeholder="Custom message" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom message</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {MESSAGE_TYPE_LABELS[t.type] ?? t.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder={
                useCustom
                  ? "Enter your message..."
                  : "Template will be filled with tenant details"
              }
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
              maxLength={1600}
              required
            />
            <p className="text-xs text-muted-foreground">
              {customBody.length}/1600 characters
            </p>
          </div>
          <Button type="submit" disabled={loading || tenants.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : smsConfig.testMode ? "Send (test)" : "Send SMS"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent messages</h2>
        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No messages yet. Send one above to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.tenant?.name ?? log.toPhone}
                    </TableCell>
                    <TableCell>
                      {log.direction === "inbound" ? (
                        <Badge variant="outline">In</Badge>
                      ) : (
                        <Badge variant="secondary">Out</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {MESSAGE_TYPE_LABELS[log.messageType] ?? log.messageType}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {log.body}
                    </TableCell>
                    <TableCell>
                      {log.status === "simulated" ? (
                        <Badge variant="secondary">Test</Badge>
                      ) : (
                        <span className="capitalize">{log.status ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.sentAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
