import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { getTenantForLoginUser } from "@/lib/tenant-portal";
import { stripe } from "@/lib/stripe";

function getPaymentAmount(maint: {
  propertyMaintenanceTaskId: string | null;
  quotedAmount: { toString: () => string } | null;
  estimatedCost: { toString: () => string } | null;
}): number | null {
  if (maint.propertyMaintenanceTaskId) {
    return maint.estimatedCost ? Number(maint.estimatedCost) : null;
  }
  if (maint.quotedAmount) {
    return Number(maint.quotedAmount);
  }
  return maint.estimatedCost ? Number(maint.estimatedCost) : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const { id } = await params;

  const isLandlordOrAgent =
    user.role === "portfolio_owner" || user.role === "admin" || user.role === "estate_agent";
  const isTenant = user.role === "tenant";

  let maintenance: {
    id: string;
    tenancyId: string | null;
    tenancy: { tenantId: string } | null;
    propertyId: string;
    propertyMaintenanceTaskId: string | null;
    quotedAmount: { toString: () => string } | null;
    estimatedCost: { toString: () => string } | null;
    paymentStatus: string;
    stripePaymentIntentId: string | null;
  } | null;

  if (isLandlordOrAgent) {
    const propertyIds = await getPropertyIdsForUser(user.id, user.role);
    if (propertyIds.length === 0) {
      return NextResponse.json({ error: "No property access" }, { status: 403 });
    }
    maintenance = await db.maintenanceRequest.findFirst({
      where: { id, propertyId: { in: propertyIds } },
      select: {
        id: true,
        tenancyId: true,
        tenancy: { select: { tenantId: true } },
        propertyId: true,
        propertyMaintenanceTaskId: true,
        quotedAmount: true,
        estimatedCost: true,
        paymentStatus: true,
        stripePaymentIntentId: true,
      },
    });
  } else if (isTenant) {
    const tenant = await getTenantForLoginUser(user.id);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant record not found" },
        { status: 404 }
      );
    }
    const tenancyIds = tenant.tenancies.map((t) => t.id);
    maintenance = await db.maintenanceRequest.findFirst({
      where: { id, tenancyId: { in: tenancyIds } },
      select: {
        id: true,
        tenancyId: true,
        tenancy: { select: { tenantId: true } },
        propertyId: true,
        propertyMaintenanceTaskId: true,
        quotedAmount: true,
        estimatedCost: true,
        paymentStatus: true,
        stripePaymentIntentId: true,
      },
    });
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!maintenance) {
    return NextResponse.json({ error: "Maintenance request not found" }, {
      status: 404,
    });
  }

  if (maintenance.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "This maintenance has already been paid" },
      { status: 400 }
    );
  }

  const amount = getPaymentAmount(maintenance);
  if (amount == null || amount <= 0) {
    return NextResponse.json(
      { error: "No payment amount set for this maintenance request" },
      { status: 400 }
    );
  }

  const amountCents = Math.round(amount * 100);
  if (amountCents < 50) {
    return NextResponse.json(
      { error: "Minimum payment amount is £0.50" },
      { status: 400 }
    );
  }

  const tenantId = maintenance.tenancy?.tenantId ?? "";
  const metadata: Record<string, string> = {
    maintenanceRequestId: maintenance.id,
    tenantId,
  };

  let paymentIntentId = maintenance.stripePaymentIntentId;
  let clientSecret: string;

  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status === "succeeded") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      );
    }
    if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
      clientSecret = pi.client_secret ?? "";
    } else {
      const updated = await stripe.paymentIntents.update(paymentIntentId, {
        amount: amountCents,
        metadata,
      });
      clientSecret = updated.client_secret ?? "";
    }
  } else {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata,
    });
    clientSecret = paymentIntent.client_secret ?? "";
    paymentIntentId = paymentIntent.id;

    await db.maintenanceRequest.update({
      where: { id },
      data: {
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
      },
    });
  }

  return NextResponse.json({
    clientSecret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}
