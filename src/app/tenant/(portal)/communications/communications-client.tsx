"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  rent_reminder: "Rent reminder",
  overdue_alert: "Overdue alert",
  inspection_request: "Inspection request",
  maintenance_ack: "Maintenance ack",
  maintenance_complete: "Maintenance complete",
  custom: "Custom",
};

type Communication = {
  id: string;
  toPhone: string;
  messageType: string;
  direction: string;
  body: string;
  status: string | null;
  sentAt: string;
};

export function CommunicationsClient({
  communications,
}: {
  communications: Communication[];
}) {
  if (communications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No messages yet
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {communications.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(log.sentAt), "dd MMM yyyy HH:mm")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={log.direction === "inbound" ? "secondary" : "default"}
                >
                  {log.direction === "inbound" ? "Received" : "Sent"}
                </Badge>
              </TableCell>
              <TableCell>
                {MESSAGE_TYPE_LABELS[log.messageType] ?? log.messageType}
              </TableCell>
              <TableCell className="max-w-md truncate">{log.body}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
