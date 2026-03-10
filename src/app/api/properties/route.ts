import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
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
  notes: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: {
      properties: {
        orderBy: { address: "asc" },
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
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { portfolioId, ...data } = parsed.data;
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) {
    return NextResponse.json(
      { error: "Portfolio not found or access denied" },
      { status: 404 }
    );
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
      notes: data.notes ?? null,
    },
  });
  return NextResponse.json(property);
}
