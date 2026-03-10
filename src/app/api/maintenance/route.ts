import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  tenancyId: z.string().optional().nullable(),
  contractorId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "urgent", "emergency"]).optional(),
  status: z
    .enum([
      "reported",
      "assigned",
      "quoted",
      "approved",
      "in_progress",
      "completed",
    ])
    .optional(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  completedDate: z.string().optional().nullable(),
  invoiceUrl: z.string().optional().nullable(),
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
  const statusFilter = searchParams.get("status");

  const where: {
    property: { portfolioId: { in: string[] } };
    status?: { not?: string; equals?: string };
  } = {
    property: { portfolioId: { in: portfolioIds } },
  };
  if (statusFilter === "open") {
    where.status = { not: "completed" };
  } else if (statusFilter) {
    where.status = { equals: statusFilter };
  }

  const maintenance = await db.maintenanceRequest.findMany({
    where,
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
    orderBy: { reportedDate: "desc" },
  });
  return NextResponse.json(maintenance);
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

  if (data.tenancyId) {
    const tenancy = await db.tenancy.findFirst({
      where: {
        id: data.tenancyId,
        propertyId: data.propertyId,
        property: { portfolioId: { in: portfolioIds } },
      },
    });
    if (!tenancy) {
      return NextResponse.json(
        { error: "Tenancy not found or does not belong to property" },
        { status: 404 }
      );
    }
  }

  if (data.contractorId) {
    const contractor = await db.contractor.findFirst({
      where: { id: data.contractorId, userId: user.id },
    });
    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found or access denied" },
        { status: 404 }
      );
    }
  }

  const maintenance = await db.maintenanceRequest.create({
    data: {
      propertyId: data.propertyId,
      tenancyId: data.tenancyId || null,
      contractorId: data.contractorId || null,
      title: data.title,
      description: data.description || null,
      priority: data.priority ?? "medium",
      status: data.status ?? "reported",
      estimatedCost: data.estimatedCost ?? null,
      actualCost: data.actualCost ?? null,
      completedDate: data.completedDate
        ? new Date(data.completedDate)
        : null,
      invoiceUrl: data.invoiceUrl || null,
    },
  });

  return NextResponse.json(
    await db.maintenanceRequest.findUnique({
      where: { id: maintenance.id },
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
    })
  );
}
