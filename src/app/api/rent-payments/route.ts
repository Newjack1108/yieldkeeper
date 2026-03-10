import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { canAccessTenancy } from "@/lib/estate-agent";
import { syncOverdueSchedules } from "@/lib/rent";
import { z } from "zod";

const createSchema = z.object({
  tenancyId: z.string().min(1),
  amount: z.number().positive(),
  paidDate: z.string().min(1),
  method: z.string().optional(),
  notes: z.string().optional(),
  rentScheduleId: z.string().optional(),
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

  const payment = await db.rentPayment.create({
    data: {
      tenancyId: data.tenancyId,
      amount: data.amount,
      paidDate: new Date(data.paidDate),
      method: data.method ?? null,
      notes: data.notes ?? null,
      rentScheduleId: data.rentScheduleId ?? null,
    },
  });

  if (data.rentScheduleId) {
    const schedule = await db.rentSchedule.findFirst({
      where: {
        id: data.rentScheduleId,
        tenancyId: data.tenancyId,
      },
    });
    if (schedule) {
      const amountDue = Number(schedule.amountDue);
      const paid = await db.rentPayment.aggregate({
        where: {
          rentScheduleId: schedule.id,
        },
        _sum: { amount: true },
      });
      const totalPaid = Number(paid._sum.amount ?? 0);
      let newStatus: "pending" | "paid" | "partial" | "overdue" = "pending";
      if (totalPaid >= amountDue) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = schedule.status === "overdue" ? "overdue" : "partial";
      }
      await db.rentSchedule.update({
        where: { id: schedule.id },
        data: { status: newStatus },
      });
    }
  }

  await syncOverdueSchedules(user.id, user.role);
  return NextResponse.json(payment);
}
