import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { getBaseUrl } from "@/lib/email";
import { randomBytes } from "crypto";

async function getTenantForUser(
  tenantId: string,
  userId: string,
  role: string
) {
  if (role === "portfolio_owner" || role === "admin") {
    return db.tenant.findFirst({
      where: { id: tenantId, userId },
    });
  }
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return null;
  const tenancy = await db.tenancy.findFirst({
    where: {
      tenantId,
      propertyId: { in: propertyIds },
    },
    select: { id: true },
  });
  if (!tenancy) return null;
  return db.tenant.findUnique({
    where: { id: tenantId },
  });
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = await getTenantForUser(id, user.id, user.role);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (!tenant.email) {
    return NextResponse.json(
      { error: "Tenant must have an email to be invited" },
      { status: 400 }
    );
  }
  const existingUser = await db.user.findUnique({
    where: { email: tenant.email.toLowerCase() },
  });
  if (existingUser && existingUser.role === "tenant") {
    // Resend invite - tenant already has login user, create new token
    if (tenant.loginUserId !== existingUser.id) {
      await db.tenant.update({
        where: { id },
        data: { loginUserId: existingUser.id },
      });
    }
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.tenantInvite.create({
      data: { tenantId: id, token, expiresAt },
    });
    const setPasswordUrl = `${getBaseUrl()}/tenant/set-password?token=${token}`;
    return NextResponse.json({ success: true, setPasswordUrl });
  }
  if (existingUser) {
    return NextResponse.json(
      { error: "This email is already used by another account" },
      { status: 400 }
    );
  }

  const { generateIdFromEntropySize } = await import("lucia");
  const loginUserId = generateIdFromEntropySize(10);
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.$transaction([
    db.user.create({
      data: {
        id: loginUserId,
        email: tenant.email.toLowerCase(),
        name: tenant.name,
        passwordHash: null,
        role: "tenant",
      },
    }),
    db.tenant.update({
      where: { id },
      data: { loginUserId },
    }),
    db.tenantInvite.create({
      data: { tenantId: id, token, expiresAt },
    }),
  ]);

  const setPasswordUrl = `${getBaseUrl()}/tenant/set-password?token=${token}`;
  return NextResponse.json({ success: true, setPasswordUrl });
}
