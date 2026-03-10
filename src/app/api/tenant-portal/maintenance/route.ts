import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z
  .object({
    tenancyId: z.string().min(1, "Tenancy is required"),
    propertyMaintenanceTaskId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    priority: z
      .enum(["low", "medium", "urgent", "emergency"])
      .optional()
      .default("medium"),
  })
  .refine(
    (data) => data.propertyMaintenanceTaskId != null || (data.title != null && data.title.length > 0),
    { message: "Either propertyMaintenanceTaskId or title is required", path: ["title"] }
  );

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant record not found" },
      { status: 404 }
    );
  }

  const tenancyIds = tenant.tenancies.map((t) => t.id);
  const propertyIds = tenant.tenancies.map((t) => t.propertyId);

  const [maintenance, availableTasks] = await Promise.all([
    db.maintenanceRequest.findMany({
      where: { tenancyId: { in: tenancyIds } },
      include: {
        property: { select: { id: true, address: true } },
        tenancy: {
          select: {
            id: true,
            property: { select: { address: true } },
          },
        },
        propertyMaintenanceTask: {
          select: { id: true, taskType: true, name: true, price: true },
        },
      },
      orderBy: { reportedDate: "desc" },
    }),
    db.propertyMaintenanceTask.findMany({
      where: { propertyId: { in: propertyIds }, enabled: true },
      orderBy: { taskType: "asc" },
    }),
  ]);

  const tasksByProperty = tenant.tenancies.map((t) => ({
    tenancyId: t.id,
    propertyAddress: t.property?.address ?? "",
    tasks: availableTasks
      .filter((task) => task.propertyId === t.propertyId)
      .map((task) => ({
        id: task.id,
        taskType: task.taskType,
        name: task.name,
        price: Number(task.price),
      })),
  }));

  return NextResponse.json({
    maintenance: maintenance.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      priority: m.priority,
      status: m.status,
      reportedDate: m.reportedDate.toISOString(),
      completedDate: m.completedDate?.toISOString(),
      propertyAddress: m.property?.address,
      quotedAmount: m.quotedAmount != null ? Number(m.quotedAmount) : null,
      paymentStatus: m.paymentStatus,
      tenantPaidAmount: m.tenantPaidAmount != null ? Number(m.tenantPaidAmount) : null,
      estimatedCost: m.estimatedCost != null ? Number(m.estimatedCost) : null,
      propertyMaintenanceTaskId: m.propertyMaintenanceTaskId,
      taskName: m.propertyMaintenanceTask?.name,
    })),
    availableTasks: tasksByProperty,
  });
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await getTenantForLoginUser(user.id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant record not found" },
      { status: 404 }
    );
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

  const tenancy = await db.tenancy.findFirst({
    where: {
      id: data.tenancyId,
      tenantId: tenant.id,
    },
    include: { property: true },
  });

  if (!tenancy) {
    return NextResponse.json(
      { error: "Tenancy not found or access denied" },
      { status: 404 }
    );
  }

  let title: string;
  let description: string | null = data.description ?? null;
  let propertyMaintenanceTaskId: string | null = null;
  let estimatedCost: number | null = null;

  if (data.propertyMaintenanceTaskId) {
    const task = await db.propertyMaintenanceTask.findFirst({
      where: {
        id: data.propertyMaintenanceTaskId,
        propertyId: tenancy.propertyId,
        enabled: true,
      },
    });
    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found or not available for this property" },
        { status: 400 }
      );
    }
    title = task.name;
    propertyMaintenanceTaskId = task.id;
    estimatedCost = Number(task.price);
  } else {
    title = data.title!;
  }

  const maintenance = await db.maintenanceRequest.create({
    data: {
      propertyId: tenancy.propertyId,
      tenancyId: tenancy.id,
      propertyMaintenanceTaskId,
      title,
      description,
      priority: data.priority,
      status: "reported",
      estimatedCost,
    },
  });

  return NextResponse.json({
    id: maintenance.id,
    title: maintenance.title,
    status: maintenance.status,
    estimatedCost: maintenance.estimatedCost != null ? Number(maintenance.estimatedCost) : null,
  });
}
