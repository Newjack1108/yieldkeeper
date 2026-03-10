import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
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

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  if (propertyIds.length === 0) return NextResponse.json([]);
  const tenancies = await db.tenancy.findMany({
    where: { propertyId: { in: propertyIds } },
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
  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (!propertyIds.includes(data.propertyId)) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const tenant = await db.tenant.findFirst({
    where: { id: data.tenantId },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (user.role === "portfolio_owner" || user.role === "admin") {
    if (tenant.userId !== user.id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
  } else {
    const tenantTenancy = await db.tenancy.findFirst({
      where: {
        tenantId: data.tenantId,
        propertyId: { in: propertyIds },
      },
    });
    if (!tenantTenancy) {
      return NextResponse.json({ error: "Tenant not found or access denied" }, { status: 404 });
    }
  }

  const property = await db.property.findFirst({
    where: { id: data.propertyId },
  });

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
