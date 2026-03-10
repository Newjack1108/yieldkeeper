import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const createSchema = z.object({
  content: z.string().min(1),
  type: z
    .string()
    .optional()
    .transform((v) =>
      v && ["call", "meeting", "note", "email"].includes(v) ? v : null
    ),
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
  });
  if (!tenancy) return null;
  return db.tenant.findUnique({ where: { id: tenantId } });
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

  const notes = await db.tenantActivityNote.findMany({
    where: { tenantId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.createdAt.toISOString(),
      user: n.user,
    }))
  );
}

export async function POST(
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const note = await db.tenantActivityNote.create({
    data: {
      tenantId: id,
      userId: user.id,
      content: parsed.data.content,
      type: parsed.data.type ?? null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    id: note.id,
    content: note.content,
    type: note.type,
    createdAt: note.createdAt.toISOString(),
    user: note.user,
  });
}
