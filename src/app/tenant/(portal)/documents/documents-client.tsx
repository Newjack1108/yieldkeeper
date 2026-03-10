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
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No documents yet
      </p>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="shrink-0">
                  {TYPE_LABELS[doc.type] ?? doc.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.filename}</span>
              </div>
              <Link
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button
                  variant="default"
                  size="lg"
                  className="w-full min-h-[44px] gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
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
