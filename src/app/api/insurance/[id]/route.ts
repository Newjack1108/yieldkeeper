import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  provider: z.string().min(1).optional(),
  policyNumber: z.string().optional().nullable(),
  premium: z.coerce.number().min(0).optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  coverageNotes: z.string().optional().nullable(),
});

async function getPolicyForUser(
  policyId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.insurancePolicy.findFirst({
    where: {
      id: policyId,
      property: { portfolioId: { in: portfolioIds } },
    },
    include: {
      property: { select: { id: true, address: true } },
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
  if (user.role === "estate_agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const policy = await getPolicyForUser(id, user.id);
  if (!policy) {
    return NextResponse.json({ error: "Insurance policy not found" }, {
      status: 404,
    });
  }
  return NextResponse.json(policy);
}

export async function PATCH(
  request: Request,
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
  const policy = await getPolicyForUser(id, user.id);
  if (!policy) {
    return NextResponse.json({ error: "Insurance policy not found" }, {
      status: 404,
    });
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

  const updated = await db.insurancePolicy.update({
    where: { id },
    data: {
      ...(data.provider != null && { provider: data.provider }),
      ...(data.policyNumber !== undefined && {
        policyNumber: data.policyNumber,
      }),
      ...(data.premium !== undefined && { premium: data.premium }),
      ...(data.renewalDate !== undefined && {
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      }),
      ...(data.coverageNotes !== undefined && {
        coverageNotes: data.coverageNotes,
      }),
    },
  });

  return NextResponse.json(
    await db.insurancePolicy.findUnique({
      where: { id: updated.id },
      include: {
        property: { select: { id: true, address: true } },
      },
    })
  );
}

export async function DELETE(
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
  const policy = await getPolicyForUser(id, user.id);
  if (!policy) {
    return NextResponse.json({ error: "Insurance policy not found" }, {
      status: 404,
    });
  }
  await db.insurancePolicy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
