import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const updateSchema = z.object({
  roomName: z.string().min(1).optional(),
  conditionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getInspectionForUser(
  inspectionId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  return db.inspection.findFirst({
    where: {
      id: inspectionId,
      propertyId: { in: propertyIds },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, itemId } = await params;
  const inspection = await getInspectionForUser(id, user.id, user.role);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  const existingItem = await db.inspectionItem.findFirst({
    where: { id: itemId, inspectionId: id },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
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

  const updated = await db.inspectionItem.update({
    where: { id: itemId },
    data: {
      ...(data.roomName !== undefined && { roomName: data.roomName }),
      ...(data.conditionRating !== undefined && {
        conditionRating: data.conditionRating,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, itemId } = await params;
  const inspection = await getInspectionForUser(id, user.id, user.role);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  const existingItem = await db.inspectionItem.findFirst({
    where: { id: itemId, inspectionId: id },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await db.inspectionItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
