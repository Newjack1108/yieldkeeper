import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const COMPLIANCE_TYPES = [
  "gas_safety",
  "eicr",
  "epc",
  "smoke_alarm",
  "hmo_license",
  "insurance",
  "other",
] as const;

const createSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(COMPLIANCE_TYPES),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().min(1),
  certificateNumber: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getPortfolioIdsForUser(userId: string): Promise<string[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  return portfolios.map((p) => p.id);
}

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const portfolioIds = await getPortfolioIdsForUser(user.id);

  const records = await db.complianceRecord.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
  return NextResponse.json(records);
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

  const record = await db.complianceRecord.create({
    data: {
      propertyId: data.propertyId,
      type: data.type,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: new Date(data.expiryDate),
      certificateNumber: data.certificateNumber || null,
      documentUrl: data.documentUrl || null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json(
    await db.complianceRecord.findUnique({
      where: { id: record.id },
      include: {
        property: { select: { id: true, address: true } },
      },
    })
  );
}
