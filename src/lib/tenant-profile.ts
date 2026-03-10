import { db } from "@/lib/db";

export type TenantProfile = NonNullable<
  Awaited<ReturnType<typeof getTenantProfile>>
>;

export async function getTenantProfile(tenantId: string, userId: string) {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, userId },
  });
  if (!tenant) return null;

  const [
    tenancies,
    smsLogs,
    documents,
    activityNotes,
  ] = await Promise.all([
    db.tenancy.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, address: true } },
        unit: { select: { id: true, unitLabel: true } },
        rentSchedules: {
          orderBy: { dueDate: "desc" },
          take: 24,
        },
        rentPayments: {
          orderBy: { paidDate: "desc" },
          take: 50,
        },
        maintenanceItems: {
          orderBy: { reportedDate: "desc" },
          take: 20,
          include: {
            property: { select: { id: true, address: true } },
          },
        },
        inspections: {
          orderBy: { scheduledDate: "desc" },
          take: 20,
          include: {
            property: { select: { id: true, address: true } },
          },
        },
        occupants: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    db.smsLog.findMany({
      where: { tenantId },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
    db.document.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, address: true } },
      },
      orderBy: { uploadedAt: "desc" },
      take: 50,
    }),
    db.tenantActivityNote.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const overdueAgg = await db.rentSchedule.groupBy({
    by: ["tenancyId"],
    where: {
      status: "overdue",
      tenancy: { tenantId },
    },
    _sum: { amountDue: true },
  });
  const arrearsByTenancy = new Map(
    overdueAgg.map((a) => [a.tenancyId, Number(a._sum.amountDue ?? 0)])
  );

  const tenanciesWithArrears = tenancies.map((t) => ({
    ...t,
    arrears: arrearsByTenancy.get(t.id) ?? 0,
  }));

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      emergencyContact: tenant.emergencyContact,
      notes: tenant.notes,
      createdAt: tenant.createdAt.toISOString(),
      loginUserId: tenant.loginUserId,
    },
    tenancies: tenanciesWithArrears.map((t) => ({
      id: t.id,
      propertyId: t.propertyId,
      unitId: t.unitId,
      startDate: t.startDate.toISOString().slice(0, 10),
      endDate: t.endDate?.toISOString().slice(0, 10) ?? null,
      rentAmount: Number(t.rentAmount),
      rentFrequency: t.rentFrequency,
      depositAmount: t.depositAmount != null ? Number(t.depositAmount) : null,
      status: t.status,
      notes: t.notes,
      arrears: t.arrears,
      property: t.property,
      unit: t.unit,
      rentSchedules: t.rentSchedules.map((s) => ({
        id: s.id,
        dueDate: s.dueDate.toISOString().slice(0, 10),
        amountDue: Number(s.amountDue),
        status: s.status,
      })),
      rentPayments: t.rentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paidDate: p.paidDate.toISOString().slice(0, 10),
        method: p.method,
        notes: p.notes,
        rentScheduleId: p.rentScheduleId,
      })),
      maintenanceItems: t.maintenanceItems.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        priority: m.priority,
        status: m.status,
        reportedDate: m.reportedDate.toISOString(),
        completedDate: m.completedDate?.toISOString() ?? null,
        property: m.property,
      })),
      inspections: t.inspections.map((i) => ({
        id: i.id,
        type: i.type,
        scheduledDate: i.scheduledDate?.toISOString().slice(0, 10) ?? null,
        completedDate: i.completedDate?.toISOString().slice(0, 10) ?? null,
        status: i.status,
        overallRating: i.overallRating,
        property: i.property,
      })),
      occupants: t.occupants.map((o) => ({
        id: o.id,
        name: o.name,
        relationship: o.relationship,
        phone: o.phone,
        email: o.email,
        notes: o.notes,
      })),
    })),
    smsLogs: smsLogs.map((s) => ({
      id: s.id,
      toPhone: s.toPhone,
      messageType: s.messageType,
      direction: s.direction,
      body: s.body,
      status: s.status,
      sentAt: s.sentAt.toISOString(),
    })),
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      filename: d.filename,
      url: d.url,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt.toISOString(),
      property: d.property,
    })),
    activityNotes: activityNotes.map((n) => ({
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.createdAt.toISOString(),
      user: n.user,
    })),
  };
}
