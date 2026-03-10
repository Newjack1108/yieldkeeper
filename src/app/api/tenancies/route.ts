import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";
import { startOfMonth, addMonths } from "date-fns";

const createSchema = z.object({
  propertyId: z.string().min(1),
  tenantId: z.string().min(1),
  unitId: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  rentAmount: z.number().positive(),
  rentFrequency: z.enum(["weekly", "monthly"]).default("monthly"),
  depositAmount: z.number().optional(),
  depositScheme: z.string().optional(),
  notes: z.string().optional(),
  generateSchedules: z.boolean().default(true),
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
  const tenancies = await db.tenancy.findMany({
    where: { property: { portfolioId: { in: portfolioIds } } },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true, email: true } },
      unit: { select: { id: true, unitLabel: true } },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(tenancies);
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

  const tenant = await db.tenant.findFirst({
    where: { id: data.tenantId, userId: user.id },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const tenancy = await db.tenancy.create({
    data: {
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      unitId: data.unitId || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      rentAmount: data.rentAmount,
      rentFrequency: data.rentFrequency,
      depositAmount: data.depositAmount ?? null,
      depositScheme: data.depositScheme ?? null,
      notes: data.notes ?? null,
      status: "active",
    },
  });

  if (data.generateSchedules) {
    const start = new Date(data.startDate);
    const firstDue = startOfMonth(addMonths(start, 1));
    const end = data.endDate ? new Date(data.endDate) : addMonths(firstDue, 12);
    const schedules = [];
    for (let i = 0; i < 12; i++) {
      const dueDate = addMonths(firstDue, i);
      if (dueDate > end) break;
      schedules.push({
        tenancyId: tenancy.id,
        dueDate,
        amountDue: data.rentAmount,
        status: dueDate < new Date() ? ("overdue" as const) : ("pending" as const),
      });
    }
    if (schedules.length) {
      await db.rentSchedule.createMany({
        data: schedules,
      });
    }
  }

  return NextResponse.json(
    await db.tenancy.findUnique({
      where: { id: tenancy.id },
      include: {
        property: { select: { id: true, address: true } },
        tenant: { select: { id: true, name: true, email: true } },
      },
    })
  );
}
