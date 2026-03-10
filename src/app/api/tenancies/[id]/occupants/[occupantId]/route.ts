import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const RELATIONSHIPS = [
  "partner",
  "spouse",
  "sibling",
  "parent",
  "child",
  "roommate",
  "lodger",
  "other",
] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  relationship: z.enum(RELATIONSHIPS).optional(),
  phone: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getOccupantForUser(
  tenancyId: string,
  occupantId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.tenancyOccupant.findFirst({
    where: {
      id: occupantId,
      tenancyId,
      tenancy: {
        property: { portfolioId: { in: portfolioIds } },
      },
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; occupantId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tenancyId, occupantId } = await params;
  const occupant = await getOccupantForUser(tenancyId, occupantId, user.id);
  if (!occupant) {
    return NextResponse.json({ error: "Occupant not found" }, { status: 404 });
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
  const updated = await db.tenancyOccupant.update({
    where: { id: occupantId },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.relationship != null && { relationship: data.relationship }),
      ...(data.phone !== undefined && {
        phone: data.phone === "" ? null : data.phone,
      }),
      ...(data.email !== undefined && {
        email: data.email === "" || data.email === null ? null : data.email,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    relationship: updated.relationship,
    phone: updated.phone,
    email: updated.email,
    notes: updated.notes,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; occupantId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tenancyId, occupantId } = await params;
  const occupant = await getOccupantForUser(tenancyId, occupantId, user.id);
  if (!occupant) {
    return NextResponse.json({ error: "Occupant not found" }, { status: 404 });
  }

  await db.tenancyOccupant.delete({ where: { id: occupantId } });
  return NextResponse.json({ success: true });
}
