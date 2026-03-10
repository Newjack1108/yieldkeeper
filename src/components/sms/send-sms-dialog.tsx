"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  rent_reminder: "Rent reminder",
  overdue_alert: "Overdue alert",
  inspection_request: "Inspection request",
  maintenance_ack: "Maintenance ack",
  maintenance_complete: "Maintenance complete",
  custom: "Custom",
};

export function formatTemplateLabel(type: string): string {
  if (MESSAGE_TYPE_LABELS[type]) return MESSAGE_TYPE_LABELS[type];
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

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

type Template = { id: string; type: string; content: string; isActive: boolean };

type SendSmsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  address?: string;
  amount?: string;
  templates: Template[];
  smsConfig?: { testMode: boolean };
  onSuccess?: () => void;
};

export function SendSmsDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  address = "",
  amount = "",
  templates,
  smsConfig = { testMode: false },
  onSuccess,
}: SendSmsDialogProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const useCustom = !templateId || selectedTemplate?.type === "custom";

  useEffect(() => {
    if (!useCustom && selectedTemplate) {
      setCustomBody(
        replaceVars(selectedTemplate.content, {
          tenantName,
          amount,
          address,
        })
      );
    } else if (!templateId) {
      setCustomBody("");
    }
  }, [templateId, tenantName, amount, address, selectedTemplate, useCustom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
      setTemplateId("");
      setCustomBody("");
      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS to {tenantName}</DialogTitle>
        </DialogHeader>
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
                    {formatTemplateLabel(t.type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending..." : smsConfig.testMode ? "Send (test)" : "Send SMS"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
