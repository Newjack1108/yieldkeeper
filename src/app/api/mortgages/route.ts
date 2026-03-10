import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  lender: z.string().min(1),
  interestRate: z.coerce.number().min(0).optional().nullable(),
  loanBalance: z.coerce.number().min(0).optional().nullable(),
  paymentAmount: z.coerce.number().min(0).optional().nullable(),
  paymentFrequency: z.string().optional().nullable(),
  nextPaymentDate: z.string().optional().nullable(),
  fixedRateEndDate: z.string().optional().nullable(),
  termEndDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

  const mortgages = await db.mortgage.findMany({
    where,
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { nextPaymentDate: "asc" },
  });
  return NextResponse.json(mortgages);
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

  const mortgage = await db.mortgage.create({
    data: {
      propertyId: data.propertyId,
      lender: data.lender,
      interestRate: data.interestRate ?? null,
      loanBalance: data.loanBalance ?? null,
      paymentAmount: data.paymentAmount ?? null,
      paymentFrequency: data.paymentFrequency ?? null,
      nextPaymentDate: data.nextPaymentDate
        ? new Date(data.nextPaymentDate)
        : null,
      fixedRateEndDate: data.fixedRateEndDate
        ? new Date(data.fixedRateEndDate)
        : null,
      termEndDate: data.termEndDate ? new Date(data.termEndDate) : null,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json(
    await db.mortgage.findUnique({
      where: { id: mortgage.id },
      include: {
        property: { select: { id: true, address: true } },
      },
    })
  );
}
