import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getSmsConfig } from "@/lib/sms";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getSmsConfig());
}
