import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const quoteSchema = z.object({
  quotedAmount: z.coerce.number().min(0, "Quote amount must be 0 or greater"),
});

async function getMaintenanceForUser(
  maintenanceId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  return db.maintenanceRequest.findFirst({
    where: {
      id: maintenanceId,
      propertyId: { in: propertyIds },
    },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { id: true, name: true } },
        },
      },
      contractor: { select: { id: true, name: true, tradeType: true } },
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "portfolio_owner" && user.role !== "admin" && user.role !== "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const maintenance = await getMaintenanceForUser(id, user.id, user.role);
  if (!maintenance) {
    return NextResponse.json({ error: "Maintenance request not found" }, {
      status: 404,
    });
  }
  const body = await request.json();
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const updated = await db.maintenanceRequest.update({
    where: { id },
    data: {
      quotedAmount: parsed.data.quotedAmount,
      quotedAt: new Date(),
      quotedById: user.id,
      status: "quoted",
    },
  });
  return NextResponse.json({
    id: updated.id,
    quotedAmount: Number(updated.quotedAmount),
    quotedAt: updated.quotedAt?.toISOString(),
    status: updated.status,
  });
}
