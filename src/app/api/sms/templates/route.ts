import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await db.smsTemplate.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(templates);
}
