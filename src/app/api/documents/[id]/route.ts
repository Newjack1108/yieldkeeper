import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";

async function getDocumentForUser(
  documentId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  let tenantIds: string[];
  if (role === "estate_agent") {
    const tenancies = await db.tenancy.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { tenantId: true },
    });
    tenantIds = [...new Set(tenancies.map((t) => t.tenantId))];
  } else {
    tenantIds = (
      await db.tenant.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((t) => t.id);
  }
  const tenancyIds =
    propertyIds.length > 0
      ? (
          await db.tenancy.findMany({
            where: { propertyId: { in: propertyIds } },
            select: { id: true },
          })
        ).map((t) => t.id)
      : [];
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
  const document = await getDocumentForUser(id, user.id, user.role);
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
  const document = await getDocumentForUser(id, user.id, user.role);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  await db.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
