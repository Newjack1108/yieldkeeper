import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";

async function getDocumentForUser(documentId: string, userId: string) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  const propertyIds = (
    await db.property.findMany({
      where: { portfolioId: { in: portfolioIds } },
      select: { id: true },
    })
  ).map((p) => p.id);
  const tenantIds = (
    await db.tenant.findMany({
      where: { userId },
      select: { id: true },
    })
  ).map((t) => t.id);
  const tenancyIds = (
    await db.tenancy.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { id: true },
    })
  ).map((t) => t.id);
  const maintenanceIds = (
    await db.maintenanceRequest.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { id: true },
    })
  ).map((m) => m.id);
  const complianceIds = (
    await db.complianceRecord.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { id: true },
    })
  ).map((c) => c.id);

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true } },
      maintenanceRequest: { select: { id: true, title: true } },
      complianceRecord: { select: { id: true, type: true } },
    },
  });

  if (!doc) return null;

  const hasAccess =
    (doc.propertyId && propertyIds.includes(doc.propertyId)) ||
    (doc.tenantId && tenantIds.includes(doc.tenantId)) ||
    (doc.tenancyId && tenancyIds.includes(doc.tenancyId)) ||
    (doc.maintenanceRequestId && maintenanceIds.includes(doc.maintenanceRequestId)) ||
    (doc.complianceRecordId && complianceIds.includes(doc.complianceRecordId));

  return hasAccess ? doc : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json(document);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  await db.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
