import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "estate_agent") {
    const propertyIds = await getPropertyIdsForUser(user.id, user.role);
    if (propertyIds.length === 0) return NextResponse.json([]);
    const tenancies = await db.tenancy.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { tenantId: true },
    });
    const tenantIds = [...new Set(tenancies.map((t) => t.tenantId))];
    if (tenantIds.length === 0) return NextResponse.json([]);
    const tenants = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tenants);
  }
  const tenants = await db.tenant.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tenants);
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { name, email, phone, emergencyContact, notes } = parsed.data;
  const tenant = await db.tenant.create({
    data: {
      userId: user.id,
      name,
      email: email || null,
      phone: phone || null,
      emergencyContact: emergencyContact || null,
      notes: notes || null,
    },
  });
  return NextResponse.json(tenant);
}
