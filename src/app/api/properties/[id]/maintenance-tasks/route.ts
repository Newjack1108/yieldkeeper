import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const TASK_TYPES = [
  "window_cleaning",
  "grass_cutting",
  "gutter_cleanout",
  "patio_cleaning",
  "fence_repair",
  "other",
] as const;

const createSchema = z.object({
  taskType: z.enum(TASK_TYPES),
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  enabled: z.boolean().optional().default(true),
});

async function canAccessProperty(
  propertyId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  return propertyIds.includes(propertyId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: propertyId } = await params;
  const hasAccess = await canAccessProperty(propertyId, user.id, user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  const tasks = await db.propertyMaintenanceTask.findMany({
    where: { propertyId },
    orderBy: { taskType: "asc" },
  });
  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      taskType: t.taskType,
      name: t.name,
      price: Number(t.price),
      enabled: t.enabled,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: propertyId } = await params;
  const hasAccess = await canAccessProperty(propertyId, user.id, user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
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

  const existing = await db.propertyMaintenanceTask.findFirst({
    where: { propertyId, taskType: data.taskType },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A task with this type already exists for this property" },
      { status: 400 }
    );
  }

  const task = await db.propertyMaintenanceTask.create({
    data: {
      propertyId,
      taskType: data.taskType,
      name: data.name,
      price: data.price,
      enabled: data.enabled,
    },
  });
  return NextResponse.json({
    id: task.id,
    taskType: task.taskType,
    name: task.name,
    price: Number(task.price),
    enabled: task.enabled,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
}
