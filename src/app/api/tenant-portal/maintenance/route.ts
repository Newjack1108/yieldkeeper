import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  tenancyId: z.string().min(1, "Tenancy is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  priority: z
    .enum(["low", "medium", "urgent", "emergency"])
    .optional()
    .default("medium"),
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

  const tenancyIds = tenant.tenancies.map((t) => t.id);

  const maintenance = await db.maintenanceRequest.findMany({
    where: { tenancyId: { in: tenancyIds } },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          property: { select: { address: true } },
        },
      },
    },
    orderBy: { reportedDate: "desc" },
  });

  return NextResponse.json(
    maintenance.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      priority: m.priority,
      status: m.status,
      reportedDate: m.reportedDate.toISOString(),
      completedDate: m.completedDate?.toISOString(),
      propertyAddress: m.property?.address,
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

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const tenancy = await db.tenancy.findFirst({
    where: {
      id: data.tenancyId,
      tenantId: tenant.id,
    },
  });

  if (!tenancy) {
    return NextResponse.json(
      { error: "Tenancy not found or access denied" },
      { status: 404 }
    );
  }

  const maintenance = await db.maintenanceRequest.create({
    data: {
      propertyId: tenancy.propertyId,
      tenancyId: tenancy.id,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: "reported",
    },
  });

  return NextResponse.json({
    id: maintenance.id,
    title: maintenance.title,
    status: maintenance.status,
  });
}
