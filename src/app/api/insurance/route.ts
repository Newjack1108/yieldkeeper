import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  provider: z.string().min(1),
  policyNumber: z.string().optional().nullable(),
  premium: z.coerce.number().min(0).optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  coverageNotes: z.string().optional().nullable(),
});

async function getPortfolioIdsForUser(userId: string): Promise<string[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  return portfolios.map((p) => p.id);
}

export async function GET(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolioIds = await getPortfolioIdsForUser(user.id);
  const { searchParams } = new URL(request.url);
  const propertyIdFilter = searchParams.get("propertyId");

  const where: {
    property: { portfolioId: { in: string[] } };
    propertyId?: string;
  } = {
    property: { portfolioId: { in: portfolioIds } },
  };
  if (propertyIdFilter) {
    const property = await db.property.findFirst({
      where: {
        id: propertyIdFilter,
        portfolioId: { in: portfolioIds },
      },
    });
    if (property) {
      where.propertyId = propertyIdFilter;
    }
  }

  const policies = await db.insurancePolicy.findMany({
    where,
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { renewalDate: "asc" },
  });
  return NextResponse.json(policies);
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolioIds = await getPortfolioIdsForUser(user.id);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const property = await db.property.findFirst({
    where: {
      id: data.propertyId,
      portfolioId: { in: portfolioIds },
    },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const policy = await db.insurancePolicy.create({
    data: {
      propertyId: data.propertyId,
      provider: data.provider,
      policyNumber: data.policyNumber ?? null,
      premium: data.premium ?? null,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      coverageNotes: data.coverageNotes ?? null,
    },
  });

  return NextResponse.json(
    await db.insurancePolicy.findUnique({
      where: { id: policy.id },
      include: {
        property: { select: { id: true, address: true } },
      },
    })
  );
}
