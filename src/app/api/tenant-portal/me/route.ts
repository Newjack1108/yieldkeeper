import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import {
  getTenantForLoginUser,
  resolveContact,
} from "@/lib/tenant-portal";

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

  const tenancies = tenant.tenancies.map((t) => ({
    id: t.id,
    propertyAddress: t.property.address,
    status: t.status,
  }));

  const contact = resolveContact(tenant.tenancies);

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
    },
    tenancies,
    contact,
  });
}
