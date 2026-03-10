import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  tenancyId: z.string().optional().nullable(),
  type: z.enum(["landlord", "self"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  inspector: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  overallRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

async function getInspectionForUser(
  inspectionId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.inspection.findFirst({
    where: {
      id: inspectionId,
      property: { portfolioId: { in: portfolioIds } },
    },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { id: true, name: true } },
        },
      },
      items: true,
      actions: true,
    },
  });
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
  const inspection = await getInspectionForUser(id, user.id);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  return NextResponse.json(inspection);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const inspection = await getInspectionForUser(id, user.id);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.tenancyId !== undefined && data.tenancyId !== null) {
    const portfolios = await db.portfolio.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const portfolioIds = portfolios.map((p) => p.id);
    const tenancy = await db.tenancy.findFirst({
      where: {
        id: data.tenancyId,
        propertyId: inspection.propertyId,
        property: { portfolioId: { in: portfolioIds } },
      },
    });
    if (!tenancy) {
      return NextResponse.json(
        { error: "Tenancy not found or does not belong to property" },
        { status: 404 }
      );
    }
  }

  const updated = await db.inspection.update({
    where: { id },
    data: {
      ...(data.tenancyId !== undefined && { tenancyId: data.tenancyId }),
      ...(data.type != null && { type: data.type }),
      ...(data.scheduledDate !== undefined && {
        scheduledDate: data.scheduledDate
          ? new Date(data.scheduledDate)
          : null,
      }),
      ...(data.completedDate !== undefined && {
        completedDate: data.completedDate
          ? new Date(data.completedDate)
          : null,
      }),
      ...(data.inspector !== undefined && { inspector: data.inspector }),
      ...(data.nextDueDate !== undefined && {
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      }),
      ...(data.overallRating !== undefined && {
        overallRating: data.overallRating,
      }),
      ...(data.status != null && { status: data.status }),
    },
  });

  return NextResponse.json(
    await db.inspection.findUnique({
      where: { id: updated.id },
      include: {
        property: { select: { id: true, address: true } },
        tenancy: {
          select: {
            id: true,
            tenant: { select: { id: true, name: true } },
          },
        },
        items: true,
        actions: true,
      },
    })
  );
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
  const inspection = await getInspectionForUser(id, user.id);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  await db.inspection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
