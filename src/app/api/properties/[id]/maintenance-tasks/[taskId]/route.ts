import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

async function getTaskForUser(
  taskId: string,
  propertyId: string,
  userId: string,
  role: string
) {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (!propertyIds.includes(propertyId)) return null;
  return db.propertyMaintenanceTask.findFirst({
    where: { id: taskId, propertyId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: propertyId, taskId } = await params;
  const task = await getTaskForUser(taskId, propertyId, user.id, user.role);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
  const updated = await db.propertyMaintenanceTask.update({
    where: { id: taskId },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
  return NextResponse.json({
    id: updated.id,
    taskType: updated.taskType,
    name: updated.name,
    price: Number(updated.price),
    enabled: updated.enabled,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: propertyId, taskId } = await params;
  const task = await getTaskForUser(taskId, propertyId, user.id, user.role);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  await db.propertyMaintenanceTask.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}
