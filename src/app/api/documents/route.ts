import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const DOCUMENT_TYPES = [
  "tenancy_agreement",
  "certificate",
  "invoice",
  "insurance",
  "mortgage",
  "inspection_photo",
  "other",
] as const;

const createSchema = z.object({
  propertyId: z.string().optional().nullable(),
  tenantId: z.string().optional().nullable(),
  tenancyId: z.string().optional().nullable(),
  maintenanceRequestId: z.string().optional().nullable(),
  complianceRecordId: z.string().optional().nullable(),
  type: z.enum(DOCUMENT_TYPES),
  filename: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().optional().nullable(),
  size: z.coerce.number().int().min(0).optional().nullable(),
});

async function getPortfolioIdsForUser(userId: string): Promise<string[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  return portfolios.map((p) => p.id);
}

export async function GET(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolioIds = await getPortfolioIdsForUser(user.id);
  const propertyIds = (
    await db.property.findMany({
      where: { portfolioId: { in: portfolioIds } },
      select: { id: true },
    })
  ).map((p) => p.id);
  const tenantIds = (
    await db.tenant.findMany({
      where: { userId: user.id },
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

  const { searchParams } = new URL(request.url);
  const propertyIdFilter = searchParams.get("propertyId");
  const typeFilter = searchParams.get("type");
  const maintenanceFilter = searchParams.get("maintenanceRequestId");
  const complianceFilter = searchParams.get("complianceRecordId");

  const orConditions: object[] = [];
  if (propertyIds.length > 0) orConditions.push({ propertyId: { in: propertyIds } });
  if (tenantIds.length > 0) orConditions.push({ tenantId: { in: tenantIds } });
  if (tenancyIds.length > 0) orConditions.push({ tenancyId: { in: tenancyIds } });
  if (maintenanceIds.length > 0) orConditions.push({ maintenanceRequestId: { in: maintenanceIds } });
  if (complianceIds.length > 0) orConditions.push({ complianceRecordId: { in: complianceIds } });

  const andParts: object[] = orConditions.length > 0 ? [{ OR: orConditions }] : [];
  if (propertyIdFilter && propertyIds.includes(propertyIdFilter)) {
    andParts.push({ propertyId: propertyIdFilter });
  }
  if (typeFilter) {
    andParts.push({ type: typeFilter });
  }
  if (maintenanceFilter && maintenanceIds.includes(maintenanceFilter)) {
    andParts.push({ maintenanceRequestId: maintenanceFilter });
  }
  if (complianceFilter && complianceIds.includes(complianceFilter)) {
    andParts.push({ complianceRecordId: complianceFilter });
  }

  const where = andParts.length > 0 ? { AND: andParts } : { id: "impossible" };

  const documents = await db.document.findMany({
    where,
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true } },
      maintenanceRequest: { select: { id: true, title: true } },
      complianceRecord: { select: { id: true, type: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolioIds = await getPortfolioIdsForUser(user.id);
  const propertyIds = (
    await db.property.findMany({
      where: { portfolioId: { in: portfolioIds } },
      select: { id: true },
    })
  ).map((p) => p.id);
  const tenantIds = (
    await db.tenant.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
  ).map((t) => t.id);

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.propertyId && !propertyIds.includes(data.propertyId)) {
    return NextResponse.json({ error: "Property not found or access denied" }, { status: 404 });
  }
  if (data.tenantId && !tenantIds.includes(data.tenantId)) {
    return NextResponse.json({ error: "Tenant not found or access denied" }, { status: 404 });
  }
  if (data.tenancyId) {
    const tenancy = await db.tenancy.findFirst({
      where: {
        id: data.tenancyId,
        property: { portfolioId: { in: portfolioIds } },
      },
    });
    if (!tenancy) {
      return NextResponse.json({ error: "Tenancy not found or access denied" }, { status: 404 });
    }
  }
  if (data.maintenanceRequestId) {
    const maint = await db.maintenanceRequest.findFirst({
      where: {
        id: data.maintenanceRequestId,
        property: { portfolioId: { in: portfolioIds } },
      },
    });
    if (!maint) {
      return NextResponse.json({ error: "Maintenance request not found or access denied" }, { status: 404 });
    }
  }
  if (data.complianceRecordId) {
    const comp = await db.complianceRecord.findFirst({
      where: {
        id: data.complianceRecordId,
        property: { portfolioId: { in: portfolioIds } },
      },
    });
    if (!comp) {
      return NextResponse.json({ error: "Compliance record not found or access denied" }, { status: 404 });
    }
  }

  const document = await db.document.create({
    data: {
      propertyId: data.propertyId || null,
      tenantId: data.tenantId || null,
      tenancyId: data.tenancyId || null,
      maintenanceRequestId: data.maintenanceRequestId || null,
      complianceRecordId: data.complianceRecordId || null,
      type: data.type,
      filename: data.filename,
      url: data.url,
      mimeType: data.mimeType || null,
      size: data.size ?? null,
      userId: user.id,
    },
  });

  return NextResponse.json(
    await db.document.findUnique({
      where: { id: document.id },
      include: {
        property: { select: { id: true, address: true } },
        tenant: { select: { id: true, name: true } },
        maintenanceRequest: { select: { id: true, title: true } },
        complianceRecord: { select: { id: true, type: true } },
      },
    })
  );
}
