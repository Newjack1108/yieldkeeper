import { NextResponse } from "next/server";
import { hash } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";
import { generateIdFromEntropySize } from "lucia";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(255),
  notes: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only portfolio owners can list estate agents (their created agents)
  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agents = await db.estateAgent.findMany({
    where: { createdByUserId: user.id },
    include: {
      user: {
        select: { email: true, name: true },
      },
      _count: {
        select: { properties: true },
      },
    },
  });

  return NextResponse.json(
    agents.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.name,
      company: a.company,
      email: a.email,
      phone: a.phone,
      notes: a.notes,
      userEmail: a.user.email,
      userName: a.user.name,
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

  const { name, company, email, phone, password, notes } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
  });
  const userId = generateIdFromEntropySize(10);

  await db.$transaction([
    db.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        name,
        passwordHash,
        role: "estate_agent",
      },
    }),
    db.estateAgent.create({
      data: {
        userId,
        createdByUserId: user.id,
        name,
        company: company ?? null,
        email: normalizedEmail,
        phone: phone ?? null,
        notes: notes ?? null,
      },
    }),
  ]);

  const agent = await db.estateAgent.findUnique({
    where: { userId },
  });

  return NextResponse.json(agent);
}
