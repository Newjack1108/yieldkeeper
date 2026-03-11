import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const createSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional().nullable(),
  inspectionItemId: z.string().optional().nullable(),
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
    include: {
      items: { select: { id: true } },
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const inspection = await getInspectionForUser(id, user.id, user.role);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
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

  if (data.inspectionItemId) {
    const itemBelongsToInspection = inspection.items.some(
      (item) => item.id === data.inspectionItemId
    );
    if (!itemBelongsToInspection) {
      return NextResponse.json(
        { error: "Inspection item not found or does not belong to this inspection" },
        { status: 400 }
      );
    }
  }

  const photo = await db.inspectionPhoto.create({
    data: {
      inspectionId: id,
      url: data.url,
      caption: data.caption ?? null,
      inspectionItemId: data.inspectionItemId ?? null,
    },
  });

  return NextResponse.json(photo);
}
