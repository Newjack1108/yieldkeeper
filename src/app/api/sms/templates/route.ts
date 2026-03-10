import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const postSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  content: z.string().min(1).max(2000),
  isActive: z.boolean().default(true),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/_+/g, "_") || "custom";
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let type = slugify(parsed.data.name);
  if (!type) type = "custom";
  let candidate = type;
  let suffix = 1;
  while (true) {
    const existing = await db.smsTemplate.findUnique({
      where: { type: candidate },
    });
    if (!existing) break;
    candidate = `${type}_${suffix}`;
    suffix++;
  }

  const template = await db.smsTemplate.create({
    data: {
      type: candidate,
      content: parsed.data.content.trim(),
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    id: template.id,
    type: template.type,
    content: template.content,
    isActive: template.isActive,
  });
}

export async function GET(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const templates = await db.smsTemplate.findMany({
    where: all ? undefined : { isActive: true },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(templates);
}
