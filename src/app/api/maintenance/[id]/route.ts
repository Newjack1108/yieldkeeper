import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  tenancyId: z.string().optional().nullable(),
  contractorId: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
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

async function getMaintenanceForUser(
  maintenanceId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.maintenanceRequest.findFirst({
    where: {
      id: maintenanceId,
      property: { portfolioId: { in: portfolioIds } },
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const maintenance = await getMaintenanceForUser(id, user.id);
  if (!maintenance) {
    return NextResponse.json({ error: "Maintenance request not found" }, {
      status: 404,
    });
  }
  return NextResponse.json(maintenance);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const maintenance = await getMaintenanceForUser(id, user.id);
  if (!maintenance) {
    return NextResponse.json({ error: "Maintenance request not found" }, {
      status: 404,
    });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.tenancyId !== undefined && data.tenancyId !== null) {
    const portfolios = await db.portfolio.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const portfolioIds = portfolios.map((p) => p.id);
    const tenancy = await db.tenancy.findFirst({
      where: {
        id: data.tenancyId,
        propertyId: maintenance.propertyId,
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

  if (data.contractorId !== undefined && data.contractorId !== null) {
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

  const updated = await db.maintenanceRequest.update({
    where: { id },
    data: {
      ...(data.tenancyId !== undefined && { tenancyId: data.tenancyId }),
      ...(data.contractorId !== undefined && {
        contractorId: data.contractorId,
      }),
      ...(data.title != null && { title: data.title }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.priority != null && { priority: data.priority }),
      ...(data.status != null && { status: data.status }),
      ...(data.estimatedCost !== undefined && {
        estimatedCost: data.estimatedCost,
      }),
      ...(data.actualCost !== undefined && { actualCost: data.actualCost }),
      ...(data.completedDate !== undefined && {
        completedDate: data.completedDate
          ? new Date(data.completedDate)
          : null,
      }),
      ...(data.invoiceUrl !== undefined && { invoiceUrl: data.invoiceUrl }),
    },
  });

  return NextResponse.json(
    await db.maintenanceRequest.findUnique({
      where: { id: updated.id },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const maintenance = await getMaintenanceForUser(id, user.id);
  if (!maintenance) {
    return NextResponse.json({ error: "Maintenance request not found" }, {
      status: 404,
    });
  }
  await db.maintenanceRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
