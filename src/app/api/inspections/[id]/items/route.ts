import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  roomName: z.string().min(1),
  conditionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
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
  const items = await db.inspectionItem.findMany({
    where: { inspectionId: id },
    include: { photos: true },
  });
  return NextResponse.json(items);
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
  const inspection = await getInspectionForUser(id, user.id);
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
  const item = await db.inspectionItem.create({
    data: {
      inspectionId: id,
      roomName: data.roomName,
      conditionRating: data.conditionRating ?? null,
      notes: data.notes ?? null,
    },
  });
  return NextResponse.json(item);
}
