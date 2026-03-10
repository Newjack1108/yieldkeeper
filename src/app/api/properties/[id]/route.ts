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
  lettingAgentId: z.string().optional().nullable(),
  lettingAgentAssignedAt: z.string().optional().nullable(),
  ownershipType: z.enum(["sole", "limited_company"]).optional(),
  landlordCompanyId: z.string().optional().nullable(),
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
    return db.property.findFirst({
      where: { id: propertyId },
      include: { landlordCompany: { select: { id: true, name: true } } },
    });
  }
  return db.property.findFirst({
    where: {
      id: propertyId,
      portfolio: { userId },
    },
    include: { landlordCompany: { select: { id: true, name: true } } },
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
  if (data.lettingAgentId !== undefined && (user.role === "portfolio_owner" || user.role === "admin")) {
    if (data.lettingAgentId) {
      const agent = await db.lettingAgent.findFirst({
        where: { id: data.lettingAgentId, userId: user.id },
      });
      if (!agent) {
        return NextResponse.json(
          { error: "Letting agent not found or access denied" },
          { status: 400 }
        );
      }
    }
  }

  if (
    (data.ownershipType !== undefined || data.landlordCompanyId !== undefined) &&
    (user.role === "portfolio_owner" || user.role === "admin")
  ) {
    const ownership = data.ownershipType ?? property?.ownershipType ?? "sole";
    if (ownership === "limited_company") {
      const companyId = data.landlordCompanyId ?? property?.landlordCompanyId;
      if (!companyId) {
        return NextResponse.json(
          { error: "Landlord company is required for limited company ownership" },
          { status: 400 }
        );
      }
      const company = await db.landlordCompany.findFirst({
        where: { id: companyId, userId: user.id },
      });
      if (!company) {
        return NextResponse.json(
          { error: "Landlord company not found or access denied" },
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
  if (data.lettingAgentId !== undefined && (user.role === "portfolio_owner" || user.role === "admin")) {
    updateData.lettingAgentId = data.lettingAgentId;
    updateData.lettingAgentAssignedAt = data.lettingAgentId && data.lettingAgentAssignedAt
      ? new Date(data.lettingAgentAssignedAt)
      : data.lettingAgentId
        ? null
        : null;
  }
  if (
    (data.ownershipType !== undefined || data.landlordCompanyId !== undefined) &&
    (user.role === "portfolio_owner" || user.role === "admin")
  ) {
    if (data.ownershipType !== undefined) {
      updateData.ownershipType = data.ownershipType;
      updateData.landlordCompanyId =
        data.ownershipType === "limited_company"
          ? data.landlordCompanyId ?? property?.landlordCompanyId
          : null;
    } else if (data.landlordCompanyId !== undefined) {
      updateData.landlordCompanyId = data.landlordCompanyId;
    }
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
