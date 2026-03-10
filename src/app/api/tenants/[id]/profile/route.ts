import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantProfile } from "@/lib/tenant-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const profile = await getTenantProfile(id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
