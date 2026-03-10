import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getAgentPropertyIds } from "@/lib/estate-agent";
import { z } from "zod";

const updateSchema = z.object({
  address: z.string().min(1).optional(),
  propertyType: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional().nullable(),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  currentValue: z.coerce.number().min(0).optional().nullable(),
  occupancyStatus: z.enum(["occupied", "vacant", "partial"]).optional(),
  estateAgentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getPropertyForUser(
  propertyId: string,
  userId: string,
  role: string
) {
  if (role === "estate_agent") {
    const propertyIds = await getAgentPropertyIds(userId);
    if (!propertyIds.includes(propertyId)) return null;
    return db.property.findFirst({ where: { id: propertyId } });
  }
  return db.property.findFirst({
    where: {
      id: propertyId,
      portfolio: { userId },
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
  const property = await getPropertyForUser(id, user.id, user.role);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  return NextResponse.json(property);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const property = await getPropertyForUser(id, user.id, user.role);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
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

  if (data.estateAgentId !== undefined && (user.role === "portfolio_owner" || user.role === "admin")) {
    if (data.estateAgentId) {
      const agent = await db.estateAgent.findFirst({
        where: { id: data.estateAgentId, createdByUserId: user.id },
      });
      if (!agent) {
        return NextResponse.json(
          { error: "Estate agent not found or access denied" },
          { status: 400 }
        );
      }
    }
  }

  const updateData: Record<string, unknown> = {
    ...(data.address != null && { address: data.address }),
    ...(data.propertyType != null && { propertyType: data.propertyType }),
    ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
    ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
    ...(data.purchaseDate !== undefined && {
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    }),
    ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
    ...(data.occupancyStatus != null && {
      occupancyStatus: data.occupancyStatus,
    }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };
  if (data.estateAgentId !== undefined && (user.role === "portfolio_owner" || user.role === "admin")) {
    updateData.estateAgentId = data.estateAgentId;
  }

  const updated = await db.property.update({
    where: { id },
    data: updateData,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const property = await getPropertyForUser(id, user.id, user.role);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  await db.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
