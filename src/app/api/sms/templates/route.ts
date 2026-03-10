import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

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
