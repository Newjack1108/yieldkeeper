import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getTenantForUser(
  tenantId: string,
  userId: string,
  role: string
) {
  if (role === "portfolio_owner" || role === "admin") {
    return db.tenant.findFirst({
      where: { id: tenantId, userId },
    });
  }
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  const tenancy = await db.tenancy.findFirst({
    where: {
      tenantId,
      propertyId: { in: propertyIds },
    },
    select: { id: true },
  });
  if (!tenancy) return null;
  return db.tenant.findUnique({
    where: { id: tenantId },
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
  const tenant = await getTenantForUser(id, user.id, user.role);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json(tenant);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tenant = await getTenantForUser(id, user.id, user.role);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
  const updated = await db.tenant.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.emergencyContact !== undefined && {
        emergencyContact: data.emergencyContact,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
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
  if (user.role === "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const tenant = await getTenantForUser(id, user.id, user.role);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  await db.tenant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
