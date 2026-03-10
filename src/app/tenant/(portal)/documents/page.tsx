import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { DocumentsClient } from "./documents-client";

export default async function TenantDocumentsPage() {
  const { user } = await validateRequest();
  if (!user || user.role !== "tenant") return null;

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) return null;

  const documents = await db.document.findMany({
    where: { tenantId: tenant.id },
    include: {
      property: { select: { address: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const docs = documents.map((doc) => ({
    id: doc.id,
    type: doc.type,
    filename: doc.filename,
    url: doc.url,
    mimeType: doc.mimeType,
    uploadedAt: doc.uploadedAt.toISOString(),
    propertyAddress: doc.property?.address ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Your tenancy agreement and related documents
        </p>
      </div>
      <DocumentsClient documents={docs} />
    </div>
  );
}
