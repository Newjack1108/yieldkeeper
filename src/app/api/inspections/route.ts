import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  tenancyId: z.string().optional().nullable(),
  type: z.enum(["landlord", "self"]),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  inspector: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  overallRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  if (propertyIds.length === 0) return NextResponse.json([]);
  const inspections = await db.inspection.findMany({
    where: { propertyId: { in: propertyIds } },
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
    orderBy: { scheduledDate: "desc" },
  });
  return NextResponse.json(inspections);
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (!propertyIds.includes(data.propertyId)) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (data.tenancyId) {
    const tenancy = await db.tenancy.findFirst({
      where: {
        id: data.tenancyId,
        propertyId: data.propertyId,
      },
    });
    if (!tenancy) {
      return NextResponse.json(
        { error: "Tenancy not found or does not belong to property" },
        { status: 404 }
      );
    }
  }

  const inspection = await db.inspection.create({
    data: {
      propertyId: data.propertyId,
      tenancyId: data.tenancyId || null,
      type: data.type,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      completedDate: data.completedDate
        ? new Date(data.completedDate)
        : null,
      inspector: data.inspector || null,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      overallRating: data.overallRating ?? null,
      status: data.status ?? "scheduled",
    },
  });

  return NextResponse.json(
    await db.inspection.findUnique({
      where: { id: inspection.id },
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
