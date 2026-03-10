import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
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

async function getTenantForUser(tenantId: string, userId: string) {
  return db.tenant.findFirst({
    where: { id: tenantId, userId },
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
  const tenant = await getTenantForUser(id, user.id);
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
  const tenant = await getTenantForUser(id, user.id);
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
