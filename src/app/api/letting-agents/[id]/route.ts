import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  setupFee: z.coerce.number().min(0).optional().nullable(),
  managementFeeType: z.enum(["monthly", "percentage"]).optional().nullable(),
  managementFeeValue: z.coerce.number().min(0).optional().nullable(),
  inventoryFee: z.coerce.number().min(0).optional().nullable(),
  renewalFee: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await db.lettingAgent.findUnique({
    where: { id },
    include: { _count: { select: { properties: true } } },
  });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (agent.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(agent);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const agent = await db.lettingAgent.findUnique({ where: { id } });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (agent.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.setupFee !== undefined) updateData.setupFee = data.setupFee;
  if (data.managementFeeType !== undefined) updateData.managementFeeType = data.managementFeeType;
  if (data.managementFeeValue !== undefined) updateData.managementFeeValue = data.managementFeeValue;
  if (data.inventoryFee !== undefined) updateData.inventoryFee = data.inventoryFee;
  if (data.renewalFee !== undefined) updateData.renewalFee = data.renewalFee;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db.lettingAgent.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const agent = await db.lettingAgent.findUnique({ where: { id } });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (agent.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.$transaction([
    db.property.updateMany({
      where: { lettingAgentId: id },
      data: { lettingAgentId: null, lettingAgentAssignedAt: null },
    }),
    db.lettingAgent.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
