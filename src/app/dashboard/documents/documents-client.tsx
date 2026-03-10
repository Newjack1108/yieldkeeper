"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { Upload, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DocumentRow = {
  id: string;
  propertyId: string | null;
  property: { id: string; address: string } | null;
  tenantId: string | null;
  tenant: { id: string; name: string } | null;
  tenancyId: string | null;
  maintenanceRequestId: string | null;
  maintenanceRequest: { id: string; title: string } | null;
  complianceRecordId: string | null;
  complianceRecord: { id: string; type: string } | null;
  type: string;
  filename: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string;
};

type Property = { id: string; address: string };
type TenancyOption = { id: string; propertyId: string; label: string };
type MaintenanceOption = { id: string; title: string; label: string };
type ComplianceOption = { id: string; type: string; label: string };

const TYPE_LABELS: Record<string, string> = {
  tenancy_agreement: "Tenancy agreement",
  certificate: "Certificate",
  invoice: "Invoice",
  insurance: "Insurance",
  mortgage: "Mortgage",
  inspection_photo: "Inspection photo",
  other: "Other",
};

function formatSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getLinkedEntityLabel(doc: DocumentRow): string {
  if (doc.property?.address) return doc.property.address;
  if (doc.tenant?.name) return `Tenant: ${doc.tenant.name}`;
  if (doc.maintenanceRequest?.title) return `Maintenance: ${doc.maintenanceRequest.title}`;
  if (doc.complianceRecord?.type) return `Compliance: ${doc.complianceRecord.type}`;
  return "—";
}

export function DocumentsPageClient({
  initialDocuments,
  properties,
  tenancies,
  maintenance,
  compliance,
}: {
  initialDocuments: DocumentRow[];
  properties: Property[];
  tenancies: TenancyOption[];
  maintenance: MaintenanceOption[];
  compliance: ComplianceOption[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [uploadType, setUploadType] = useState<string>("other");
  const [uploadPropertyId, setUploadPropertyId] = useState<string>("");
  const [uploadMaintenanceId, setUploadMaintenanceId] = useState<string>("");
  const [uploadComplianceId, setUploadComplianceId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const filteredDocuments = documents.filter((d) => {
    if (propertyFilter && d.propertyId !== propertyFilter) return false;
    if (typeFilter && d.type !== typeFilter) return false;
    return true;
  });

  async function handleUploadSuccess(result: unknown) {
    const info = (result as { info?: { secure_url?: string; original_filename?: string; bytes?: number } })?.info;
    if (!info?.secure_url) return;

    const filename = info.original_filename ?? "upload";
    const url = info.secure_url;
    const size = typeof info.bytes === "number" ? info.bytes : null;

    setUploading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: uploadPropertyId || null,
          tenantId: null,
          tenancyId: null,
          maintenanceRequestId: uploadMaintenanceId || null,
          complianceRecordId: uploadComplianceId || null,
          type: uploadType,
          filename,
          url,
          size,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? The file will remain in Cloudinary.")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    }
  }

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label htmlFor="propertyFilter" className="text-xs">Filter by property</Label>
            <select
              id="propertyFilter"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="typeFilter" className="text-xs">Filter by type</Label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {uploadPreset && cloudName ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:min-w-[280px]">
            <p className="text-sm font-medium">Upload document</p>
            <div className="flex flex-col gap-2">
              <div className="space-y-1">
                <Label htmlFor="uploadType" className="text-xs">Type</Label>
                <select
                  id="uploadType"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uploadPropertyId" className="text-xs">Property (optional)</Label>
                <select
                  id="uploadPropertyId"
                  value={uploadPropertyId}
                  onChange={(e) => setUploadPropertyId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">None</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uploadMaintenanceId" className="text-xs">Maintenance (optional)</Label>
                <select
                  id="uploadMaintenanceId"
                  value={uploadMaintenanceId}
                  onChange={(e) => setUploadMaintenanceId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">None</option>
                  {maintenance.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="uploadComplianceId" className="text-xs">Compliance (optional)</Label>
                <select
                  id="uploadComplianceId"
                  value={uploadComplianceId}
                  onChange={(e) => setUploadComplianceId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">None</option>
                  {compliance.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <CldUploadWidget
                uploadPreset={uploadPreset}
                onSuccess={handleUploadSuccess}
                config={cloudName ? { cloud: { cloudName } } : undefined}
              >
                {({ open }) => (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => open()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Saving..." : "Choose file to upload"}
                  </Button>
                )}
              </CldUploadWidget>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            Configure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to enable uploads.
          </p>
        )}
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No documents yet. Upload a file to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Linked to</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.filename}</TableCell>
                  <TableCell>{TYPE_LABELS[d.type] ?? d.type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {getLinkedEntityLabel(d)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(d.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatSize(d.size)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => window.open(d.url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(d.id)}
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
  );
}
