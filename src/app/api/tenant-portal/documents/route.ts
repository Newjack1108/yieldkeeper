import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  maintenanceRequestId: z.string().min(1, "Maintenance request is required"),
  url: z.string().url("Invalid image URL"),
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().optional().nullable(),
  size: z.coerce.number().int().min(0).optional().nullable(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant record not found" },
      { status: 404 }
    );
  }

  const documents = await db.document.findMany({
    where: { tenantId: tenant.id },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(
    documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      url: doc.url,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt.toISOString(),
      propertyAddress: doc.property?.address,
    }))
  );
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant record not found" },
      { status: 404 }
    );
  }

  const tenancyIds = tenant.tenancies.map((t) => t.id);

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const maintenance = await db.maintenanceRequest.findFirst({
    where: {
      id: data.maintenanceRequestId,
      tenancyId: { in: tenancyIds },
    },
  });

  if (!maintenance) {
    return NextResponse.json(
      { error: "Maintenance request not found or access denied" },
      { status: 404 }
    );
  }

  const document = await db.document.create({
    data: {
      propertyId: maintenance.propertyId,
      tenantId: tenant.id,
      tenancyId: maintenance.tenancyId,
      maintenanceRequestId: maintenance.id,
      type: "fault_photo",
      filename: data.filename,
      url: data.url,
      mimeType: data.mimeType ?? null,
      size: data.size ?? null,
      userId: user.id,
    },
  });

  return NextResponse.json({
    id: document.id,
    type: document.type,
    filename: document.filename,
    url: document.url,
    uploadedAt: document.uploadedAt.toISOString(),
  });
}
