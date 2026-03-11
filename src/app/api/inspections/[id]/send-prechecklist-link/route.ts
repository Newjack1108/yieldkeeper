import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { randomBytes } from "crypto";

/** POST: Generate pre-checklist token and return link (only when landlord explicitly requests) */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  if (propertyIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const inspection = await db.inspection.findFirst({
    where: {
      id,
      propertyId: { in: propertyIds },
    },
    include: {
      property: { select: { address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { name: true, phone: true } },
        },
      },
      preChecklist: true,
    },
  });

  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
  }

  if (inspection.type !== "landlord" || !inspection.tenancyId) {
    return NextResponse.json(
      { error: "Pre-checklist is only for landlord inspections with a tenancy" },
      { status: 400 }
    );
  }

  if (inspection.preChecklist) {
    return NextResponse.json(
      { error: "Pre-checklist already completed" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.inspection.update({
    where: { id },
    data: {
      preChecklistToken: token,
      preChecklistExpiresAt: expiresAt,
      status: "pending_prechecklist",
    },
  });

  const baseUrl =
    process.env.WEBHOOK_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const link = `${baseUrl}/checklist/pre/${token}`;

  return NextResponse.json({
    link,
    expiresAt: expiresAt.toISOString(),
  });
}
