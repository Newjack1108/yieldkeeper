import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const COMPLIANCE_TYPES = [
  "gas_safety",
  "eicr",
  "epc",
  "smoke_alarm",
  "hmo_license",
  "insurance",
  "other",
] as const;

const updateSchema = z.object({
  type: z.enum(COMPLIANCE_TYPES).optional(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional(),
  certificateNumber: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getComplianceForUser(
  complianceId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  return db.complianceRecord.findFirst({
    where: {
      id: complianceId,
      propertyId: { in: propertyIds },
    },
    include: {
      property: { select: { id: true, address: true } },
    },
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
  const record = await getComplianceForUser(id, user.id, user.role);
  if (!record) {
    return NextResponse.json({ error: "Compliance record not found" }, {
      status: 404,
    });
  }
  return NextResponse.json(record);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const record = await getComplianceForUser(id, user.id, user.role);
  if (!record) {
    return NextResponse.json({ error: "Compliance record not found" }, {
      status: 404,
    });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const updated = await db.complianceRecord.update({
    where: { id },
    data: {
      ...(data.type != null && { type: data.type }),
      ...(data.issueDate !== undefined && {
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
      }),
      ...(data.expiryDate !== undefined && {
        expiryDate: new Date(data.expiryDate),
      }),
      ...(data.certificateNumber !== undefined && {
        certificateNumber: data.certificateNumber,
      }),
      ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json(
    await db.complianceRecord.findUnique({
      where: { id: updated.id },
      include: {
        property: { select: { id: true, address: true } },
      },
    })
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const record = await getComplianceForUser(id, user.id, user.role);
  if (!record) {
    return NextResponse.json({ error: "Compliance record not found" }, {
      status: 404,
    });
  }
  await db.complianceRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
