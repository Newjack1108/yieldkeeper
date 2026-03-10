import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getAgentPropertyIds } from "@/lib/estate-agent";
import { z } from "zod";

const createSchema = z.object({
  portfolioId: z.string().min(1),
  address: z.string().min(1),
  propertyType: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  currentValue: z.coerce.number().min(0).optional(),
  occupancyStatus: z.enum(["occupied", "vacant", "partial"]).optional(),
  estateAgentId: z.string().optional().nullable(),
  ownershipType: z.enum(["sole", "limited_company"]).optional(),
  landlordCompanyId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "estate_agent") {
    const propertyIds = await getAgentPropertyIds(user.id);
    if (propertyIds.length === 0) {
      return NextResponse.json([]);
    }
    const properties = await db.property.findMany({
      where: { id: { in: propertyIds } },
      include: {
        portfolio: { select: { name: true } },
        landlordCompany: { select: { id: true, name: true } },
      },
      orderBy: { address: "asc" },
    });
    return NextResponse.json(
      properties.map((p) => ({
        ...p,
        portfolioName: p.portfolio.name,
      }))
    );
  }

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: {
      properties: {
        orderBy: { address: "asc" },
        include: { landlordCompany: { select: { id: true, name: true } } },
      },
    },
  });
  const properties = portfolios.flatMap((p) =>
    p.properties.map((prop) => ({
      ...prop,
      portfolioName: p.name,
    }))
  );
  return NextResponse.json(properties);
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { portfolioId, estateAgentId, ownershipType, landlordCompanyId, ...data } =
    parsed.data;
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) {
    return NextResponse.json(
      { error: "Portfolio not found or access denied" },
      { status: 404 }
    );
  }
  if (estateAgentId) {
    const agent = await db.estateAgent.findFirst({
      where: { id: estateAgentId, createdByUserId: user.id },
    });
    if (!agent) {
      return NextResponse.json(
        { error: "Estate agent not found or access denied" },
        { status: 400 }
      );
    }
  }
  const ownership = ownershipType ?? "sole";
  if (ownership === "limited_company") {
    if (!landlordCompanyId) {
      return NextResponse.json(
        { error: "Landlord company is required for limited company ownership" },
        { status: 400 }
      );
    }
    const company = await db.landlordCompany.findFirst({
      where: { id: landlordCompanyId, userId: user.id },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Landlord company not found or access denied" },
        { status: 400 }
      );
    }
  }
  const property = await db.property.create({
    data: {
      portfolioId,
      address: data.address,
      propertyType: data.propertyType ?? null,
      bedrooms: data.bedrooms ?? null,
      purchasePrice: data.purchasePrice ?? null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      currentValue: data.currentValue ?? null,
      occupancyStatus: data.occupancyStatus ?? "vacant",
      estateAgentId: estateAgentId ?? null,
      ownershipType: ownership,
      landlordCompanyId:
        ownership === "limited_company" ? landlordCompanyId : null,
      notes: data.notes ?? null,
    },
  });
  return NextResponse.json(property);
}
