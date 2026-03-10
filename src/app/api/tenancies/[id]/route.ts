import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";

async function getTenancyForUser(tenancyId: string, userId: string) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.tenancy.findFirst({
    where: {
      id: tenancyId,
      property: { portfolioId: { in: portfolioIds } },
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
  const tenancy = await getTenancyForUser(id, user.id);
  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }
  return NextResponse.json(tenancy);
}
