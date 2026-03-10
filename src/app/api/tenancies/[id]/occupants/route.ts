import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
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

const createSchema = z.object({
  name: z.string().min(1),
  relationship: z.enum(RELATIONSHIPS),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  notes: z.string().optional(),
});

async function getTenancyForUser(
  tenancyId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  return db.tenancy.findFirst({
    where: {
      id: tenancyId,
      propertyId: { in: propertyIds },
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
  const tenancy = await getTenancyForUser(id, user.id, user.role);
  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }

  const occupants = await db.tenancyOccupant.findMany({
    where: { tenancyId: id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    occupants.map((o) => ({
      id: o.id,
      name: o.name,
      relationship: o.relationship,
      phone: o.phone,
      email: o.email,
      notes: o.notes,
    }))
  );
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
  const tenancy = await getTenancyForUser(id, user.id, user.role);
  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const occupant = await db.tenancyOccupant.create({
    data: {
      tenancyId: id,
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email && parsed.data.email !== "" ? parsed.data.email : null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({
    id: occupant.id,
    name: occupant.name,
    relationship: occupant.relationship,
    phone: occupant.phone,
    email: occupant.email,
    notes: occupant.notes,
  });
}
