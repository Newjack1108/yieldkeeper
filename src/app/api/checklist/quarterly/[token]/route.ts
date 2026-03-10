import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUARTERLY_CHECKLIST_QUESTIONS } from "@/lib/checklists";

/** GET: Fetch quarterly checklist metadata and questions (public, token-based) */
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

  const checklist = await db.quarterlyChecklist.findUnique({
    where: { token },
    include: {
      tenancy: {
        include: {
          property: { select: { address: true } },
          tenant: { select: { name: true } },
        },
      },
    },
  });

  if (!checklist) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (checklist.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  if (checklist.completedAt) {
    return NextResponse.json({
      completed: true,
      completedAt: checklist.completedAt.toISOString(),
      propertyAddress: checklist.tenancy.property.address,
      tenantName: checklist.tenancy.tenant.name,
    });
  }

  return NextResponse.json({
    completed: false,
    propertyAddress: checklist.tenancy.property.address,
    tenantName: checklist.tenancy.tenant.name,
    questions: QUARTERLY_CHECKLIST_QUESTIONS,
  });
}

/** POST: Submit quarterly checklist answers (public, token-based) */
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

  const checklist = await db.quarterlyChecklist.findUnique({
    where: { token },
  });

  if (!checklist) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (checklist.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  if (checklist.completedAt) {
    return NextResponse.json(
      { error: "Checklist already completed" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const answers: Record<string, string | boolean> = {};

  for (const q of QUARTERLY_CHECKLIST_QUESTIONS) {
    const val = body[q.id];
    if (val === "yes" || val === "no") {
      answers[q.id] = val === "yes";
      if (q.type === "yes_no_with_notes" && typeof body[`${q.id}_notes`] === "string") {
        answers[`${q.id}_notes`] = body[`${q.id}_notes`];
      }
    }
    if (q.required && (val !== "yes" && val !== "no")) {
      return NextResponse.json(
        { error: `Please answer: ${q.label}` },
        { status: 400 }
      );
    }
  }

  await db.quarterlyChecklist.update({
    where: { id: checklist.id },
    data: {
      answers: answers as object,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
