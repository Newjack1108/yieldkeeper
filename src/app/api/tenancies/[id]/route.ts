import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";

async function getTenancyForUser(
  tenancyId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  return db.tenancy.findFirst({
    where: {
      id: tenancyId,
      propertyId: { in: propertyIds },
    },
    include: {
      property: { select: { id: true, address: true } },
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      unit: { select: { id: true, unitLabel: true } },
      rentSchedules: { orderBy: { dueDate: "asc" } },
      rentPayments: { orderBy: { paidDate: "desc" }, take: 20 },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tenancy = await getTenancyForUser(id, user.id, user.role);
  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }
  return NextResponse.json(tenancy);
}
