import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentsPageClient } from "./documents-client";

export default async function DocumentsPage() {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: { properties: { select: { id: true, address: true } } },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  const propertyIds = portfolios.flatMap((p) =>
    p.properties.map((prop) => prop.id)
  );

  const [tenantIds, tenancyIds, maintenanceIds, complianceIds] = await Promise.all([
    db.tenant.findMany({ where: { userId: user.id }, select: { id: true } }).then((t) => t.map((x) => x.id)),
    db.tenancy.findMany({ where: { propertyId: { in: propertyIds } }, select: { id: true } }).then((t) => t.map((x) => x.id)),
    db.maintenanceRequest.findMany({ where: { propertyId: { in: propertyIds } }, select: { id: true } }).then((m) => m.map((x) => x.id)),
    db.complianceRecord.findMany({ where: { propertyId: { in: propertyIds } }, select: { id: true } }).then((c) => c.map((x) => x.id)),
  ]);

  const orConditions: object[] = [];
  if (propertyIds.length > 0) orConditions.push({ propertyId: { in: propertyIds } });
  if (tenantIds.length > 0) orConditions.push({ tenantId: { in: tenantIds } });
  if (tenancyIds.length > 0) orConditions.push({ tenancyId: { in: tenancyIds } });
  if (maintenanceIds.length > 0) orConditions.push({ maintenanceRequestId: { in: maintenanceIds } });
  if (complianceIds.length > 0) orConditions.push({ complianceRecordId: { in: complianceIds } });

  const documents = await db.document.findMany({
    where: orConditions.length > 0 ? { OR: orConditions } : { id: "none" },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true } },
      maintenanceRequest: { select: { id: true, title: true } },
      complianceRecord: { select: { id: true, type: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const properties = await db.property.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const tenancies = await db.tenancy.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const maintenance = await db.maintenanceRequest.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    select: { id: true, title: true, property: { select: { address: true } } },
    orderBy: { reportedDate: "desc" },
  });

  const compliance = await db.complianceRecord.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    select: { id: true, type: true, property: { select: { address: true } } },
    orderBy: { expiryDate: "asc" },
  });

  const documentsFormatted = documents.map((d) => ({
    id: d.id,
    propertyId: d.propertyId,
    property: d.property,
    tenantId: d.tenantId,
    tenant: d.tenant,
    tenancyId: d.tenancyId,
    maintenanceRequestId: d.maintenanceRequestId,
    maintenanceRequest: d.maintenanceRequest,
    complianceRecordId: d.complianceRecordId,
    complianceRecord: d.complianceRecord,
    type: d.type,
    filename: d.filename,
    url: d.url,
    mimeType: d.mimeType,
    size: d.size,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  const tenanciesForSelect = tenancies.map((t) => ({
    id: t.id,
    propertyId: t.propertyId,
    label: `${t.property.address} — ${t.tenant.name}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Store and link documents (uploaded to Cloudinary)
        </p>
      </div>
      <DocumentsPageClient
        initialDocuments={documentsFormatted}
        properties={properties.map((p) => ({ id: p.id, address: p.address }))}
        tenancies={tenanciesForSelect}
        maintenance={maintenance.map((m) => ({
          id: m.id,
          title: m.title,
          label: `${m.title} — ${m.property.address}`,
        }))}
        compliance={compliance.map((c) => ({
          id: c.id,
          type: c.type,
          label: `${c.type} — ${c.property.address}`,
        }))}
      />
    </div>
  );
}
