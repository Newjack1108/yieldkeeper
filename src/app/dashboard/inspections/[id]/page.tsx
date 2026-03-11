import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { InspectionSheetClient } from "./inspection-sheet-client";

export default async function InspectionSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const propertyIds = await getPropertyIdsForUser(user.id, user.role);
  if (propertyIds.length === 0) redirect("/dashboard/inspections");

  const inspection = await db.inspection.findFirst({
    where: {
      id,
      propertyId: { in: propertyIds },
    },
    include: {
      property: { select: { id: true, address: true } },
      tenancy: {
        select: {
          id: true,
          tenant: { select: { id: true, name: true, phone: true } },
        },
      },
      items: { include: { photos: true } },
      photos: true,
      actions: true,
      preChecklist: { select: { id: true, completedAt: true } },
    },
  });

  if (!inspection) redirect("/dashboard/inspections");

  const inspectionFormatted = {
    id: inspection.id,
    propertyId: inspection.propertyId,
    property: inspection.property,
    tenancyId: inspection.tenancyId,
    tenancy: inspection.tenancy,
    type: inspection.type,
    scheduledDate: inspection.scheduledDate?.toISOString().slice(0, 10) ?? null,
    completedDate: inspection.completedDate?.toISOString().slice(0, 10) ?? null,
    inspector: inspection.inspector,
    nextDueDate: inspection.nextDueDate?.toISOString().slice(0, 10) ?? null,
    overallRating: inspection.overallRating,
    status: inspection.status ?? "scheduled",
    items: inspection.items.map((item) => ({
      id: item.id,
      roomName: item.roomName,
      conditionRating: item.conditionRating,
      notes: item.notes,
      photos: item.photos.map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
      })),
    })),
    photos: inspection.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      inspectionItemId: p.inspectionItemId,
    })),
    actions: inspection.actions.map((a) => ({
      id: a.id,
      description: a.description,
      dueDate: a.dueDate?.toISOString().slice(0, 10) ?? null,
      completedDate: a.completedDate?.toISOString().slice(0, 10) ?? null,
      status: a.status ?? "pending",
    })),
  };

  return (
    <div className="space-y-6">
      <InspectionSheetClient inspection={inspectionFormatted} />
    </div>
  );
}
