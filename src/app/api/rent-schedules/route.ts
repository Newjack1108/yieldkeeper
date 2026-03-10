import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { canAccessTenancy } from "@/lib/estate-agent";
import { syncOverdueSchedules } from "@/lib/rent";
import { z } from "zod";
import { startOfMonth, addMonths } from "date-fns";

const createSchema = z.object({
  tenancyId: z.string().min(1),
  dueDate: z.string().optional(),
  amountDue: z.number().positive(),
  generateMonths: z.number().min(1).max(24).optional(),
});

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
  const data = parsed.data;

  const hasAccess = await canAccessTenancy(data.tenancyId, user.id, user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }

  const tenancy = await db.tenancy.findUnique({
    where: { id: data.tenancyId },
  });
  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }

  const rentAmount = Number(tenancy.rentAmount);

  if (data.generateMonths) {
    const lastSchedule = await db.rentSchedule.findFirst({
      where: { tenancyId: data.tenancyId },
      orderBy: { dueDate: "desc" },
    });
    const start = lastSchedule
      ? addMonths(startOfMonth(lastSchedule.dueDate), 1)
      : startOfMonth(new Date());
    const schedules = [];
    for (let i = 0; i < data.generateMonths; i++) {
      const dueDate = addMonths(start, i);
      if (tenancy.endDate && dueDate > tenancy.endDate) break;
      schedules.push({
        tenancyId: data.tenancyId,
        dueDate,
        amountDue: rentAmount,
        status: "pending" as const,
      });
    }
    await db.rentSchedule.createMany({ data: schedules });
  } else if (data.dueDate) {
    await db.rentSchedule.create({
      data: {
        tenancyId: data.tenancyId,
        dueDate: new Date(data.dueDate),
        amountDue: data.amountDue ?? rentAmount,
        status: "pending",
      },
    });
  } else {
    return NextResponse.json(
      { error: "Provide dueDate or generateMonths" },
      { status: 400 }
    );
  }

  await syncOverdueSchedules(user.id, user.role);
  return NextResponse.json({ success: true });
}
