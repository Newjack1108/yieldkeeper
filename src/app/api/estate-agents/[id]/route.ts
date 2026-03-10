import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
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
  const agent = await db.estateAgent.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      _count: { select: { properties: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canAccess =
    user.role === "admin" ||
    user.role === "portfolio_owner" ||
    (user.role === "estate_agent" && agent.userId === user.id);

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "portfolio_owner" && agent.createdByUserId !== user.id) {
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
  const agent = await db.estateAgent.findUnique({ where: { id } });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (agent.createdByUserId !== user.id && user.role !== "admin") {
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

  const { name, company, email, phone, notes } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (company !== undefined) updateData.company = company;
  if (phone !== undefined) updateData.phone = phone;
  if (notes !== undefined) updateData.notes = notes;
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser && existingUser.id !== agent.userId) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    updateData.email = normalizedEmail;
  }

  const updated = await db.estateAgent.update({
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
  const agent = await db.estateAgent.findUnique({ where: { id } });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (agent.createdByUserId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Unassign from all properties (set estateAgentId to null), then delete agent and user
  await db.$transaction([
    db.property.updateMany({
      where: { estateAgentId: id },
      data: { estateAgentId: null },
    }),
    db.estateAgent.delete({ where: { id } }),
    db.user.delete({ where: { id: agent.userId } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
