import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  description: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  status: z.enum(["pending", "completed"]).optional(),
});

async function getInspectionForUser(
  inspectionId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.inspection.findFirst({
    where: {
      id: inspectionId,
      property: { portfolioId: { in: portfolioIds } },
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
  const inspection = await getInspectionForUser(id, user.id);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  const actions = await db.inspectionAction.findMany({
    where: { inspectionId: id },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(actions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const inspection = await getInspectionForUser(id, user.id);
  if (!inspection) {
    return NextResponse.json({ error: "Inspection not found" }, {
      status: 404,
    });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const action = await db.inspectionAction.create({
    data: {
      inspectionId: id,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      completedDate: data.completedDate
        ? new Date(data.completedDate)
        : null,
      status: data.status ?? "pending",
    },
  });
  return NextResponse.json(action);
}
