import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PRE_CHECKLIST_QUESTIONS } from "@/lib/checklists";
import { z } from "zod";

const submitSchema = z.object({
  access_confirmed: z.enum(["yes", "no"]),
  any_pets: z.enum(["yes", "no"]),
  repairs_to_report: z.enum(["yes", "no"]).optional(),
  repairs_notes: z.string().optional().nullable(),
  smoke_alarms_ok: z.enum(["yes", "no"]),
  property_condition: z.enum(["yes", "no"]),
});

/** GET: Fetch pre-checklist metadata and questions (public, token-based) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { error: "Invalid link" },
      { status: 400 }
    );
  }

  const inspection = await db.inspection.findFirst({
    where: {
      preChecklistToken: token,
    },
    include: {
      property: { select: { address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { name: true } },
        },
      },
      preChecklist: true,
    },
  });

  if (!inspection) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (inspection.preChecklistExpiresAt && inspection.preChecklistExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  if (inspection.preChecklist) {
    return NextResponse.json({
      completed: true,
      completedAt: inspection.preChecklist.completedAt.toISOString(),
      propertyAddress: inspection.property.address,
      tenantName: inspection.tenancy?.tenant.name,
      scheduledDate: inspection.scheduledDate?.toISOString() ?? null,
    });
  }

  return NextResponse.json({
    completed: false,
    propertyAddress: inspection.property.address,
    tenantName: inspection.tenancy?.tenant.name,
    scheduledDate: inspection.scheduledDate?.toISOString() ?? null,
    questions: PRE_CHECKLIST_QUESTIONS,
  });
}

/** POST: Submit pre-checklist answers (public, token-based) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { error: "Invalid link" },
      { status: 400 }
    );
  }

  const inspection = await db.inspection.findFirst({
    where: { preChecklistToken: token },
    include: {
      preChecklist: true,
      tenancy: true,
    },
  });

  if (!inspection) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (inspection.preChecklistExpiresAt && inspection.preChecklistExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  if (inspection.preChecklist) {
    return NextResponse.json(
      { error: "Pre-checklist already completed" },
      { status: 400 }
    );
  }

  if (!inspection.tenancyId) {
    return NextResponse.json(
      { error: "No tenancy linked to this inspection" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const answers: Record<string, string | boolean | null> = {
    access_confirmed: parsed.data.access_confirmed === "yes",
    any_pets: parsed.data.any_pets === "yes",
    smoke_alarms_ok: parsed.data.smoke_alarms_ok === "yes",
    property_condition: parsed.data.property_condition === "yes",
    repairs_to_report: parsed.data.repairs_to_report === "yes",
    repairs_notes: parsed.data.repairs_notes ?? null,
  };

  await db.$transaction([
    db.inspectionPreChecklist.create({
      data: {
        inspectionId: inspection.id,
        tenancyId: inspection.tenancyId,
        answers: answers as object,
      },
    }),
    db.inspection.update({
      where: { id: inspection.id },
      data: {
        status: "scheduled",
        preChecklistToken: null,
        preChecklistExpiresAt: null,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
