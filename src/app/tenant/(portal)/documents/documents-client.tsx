"use client";

import Link from "next/link";
import { FileText, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  tenancy_agreement: "Tenancy agreement",
  certificate: "Certificate",
  invoice: "Invoice",
  insurance: "Insurance",
  mortgage: "Mortgage",
  inspection_photo: "Inspection photo",
  other: "Other",
};

type Document = {
  id: string;
  type: string;
  filename: string;
  url: string;
  mimeType: string | null;
  uploadedAt: string;
  propertyAddress: string | null;
};

export function DocumentsClient({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No documents yet
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Filename</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <Badge variant="secondary">
                  {TYPE_LABELS[doc.type] ?? doc.type}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.filename}
                </span>
              </TableCell>
              <TableCell>
                {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" type="button">
                    <Download className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
