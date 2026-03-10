import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { db } from "@/lib/db";

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

  const documents = await db.document.findMany({
    where: { tenantId: tenant.id },
    include: {
      property: { select: { id: true, address: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(
    documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      url: doc.url,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt.toISOString(),
      propertyAddress: doc.property?.address,
    }))
  );
}
