import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  setupFee: z.coerce.number().min(0).optional(),
  managementFeeType: z.enum(["monthly", "percentage"]).optional(),
  managementFeeValue: z.coerce.number().min(0).optional(),
  inventoryFee: z.coerce.number().min(0).optional(),
  renewalFee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agents = await db.lettingAgent.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { properties: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      company: a.company,
      email: a.email,
      phone: a.phone,
      setupFee: a.setupFee != null ? Number(a.setupFee) : null,
      managementFeeType: a.managementFeeType,
      managementFeeValue: a.managementFeeValue != null ? Number(a.managementFeeValue) : null,
      inventoryFee: a.inventoryFee != null ? Number(a.inventoryFee) : null,
      renewalFee: a.renewalFee != null ? Number(a.renewalFee) : null,
      notes: a.notes,
      propertyCount: a._count.properties,
      createdAt: a.createdAt,
    }))
  );
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
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

  const data = parsed.data;
  const agent = await db.lettingAgent.create({
    data: {
      userId: user.id,
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      setupFee: data.setupFee != null ? data.setupFee : null,
      managementFeeType: data.managementFeeType || null,
      managementFeeValue: data.managementFeeValue != null ? data.managementFeeValue : null,
      inventoryFee: data.inventoryFee != null ? data.inventoryFee : null,
      renewalFee: data.renewalFee != null ? data.renewalFee : null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json(agent);
}
