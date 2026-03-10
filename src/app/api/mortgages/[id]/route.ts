import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  lender: z.string().min(1).optional(),
  interestRate: z.coerce.number().min(0).optional().nullable(),
  loanBalance: z.coerce.number().min(0).optional().nullable(),
  paymentAmount: z.coerce.number().min(0).optional().nullable(),
  paymentFrequency: z.string().optional().nullable(),
  nextPaymentDate: z.string().optional().nullable(),
  fixedRateEndDate: z.string().optional().nullable(),
  termEndDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getMortgageForUser(
  mortgageId: string,
  userId: string
) {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  return db.mortgage.findFirst({
    where: {
      id: mortgageId,
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
  const mortgage = await getMortgageForUser(id, user.id);
  if (!mortgage) {
    return NextResponse.json({ error: "Mortgage not found" }, { status: 404 });
  }
  return NextResponse.json(mortgage);
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
  const mortgage = await getMortgageForUser(id, user.id);
  if (!mortgage) {
    return NextResponse.json({ error: "Mortgage not found" }, { status: 404 });
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

  const updated = await db.mortgage.update({
    where: { id },
    data: {
      ...(data.lender != null && { lender: data.lender }),
      ...(data.interestRate !== undefined && {
        interestRate: data.interestRate,
      }),
      ...(data.loanBalance !== undefined && { loanBalance: data.loanBalance }),
      ...(data.paymentAmount !== undefined && {
        paymentAmount: data.paymentAmount,
      }),
      ...(data.paymentFrequency !== undefined && {
        paymentFrequency: data.paymentFrequency,
      }),
      ...(data.nextPaymentDate !== undefined && {
        nextPaymentDate: data.nextPaymentDate
          ? new Date(data.nextPaymentDate)
          : null,
      }),
      ...(data.fixedRateEndDate !== undefined && {
        fixedRateEndDate: data.fixedRateEndDate
          ? new Date(data.fixedRateEndDate)
          : null,
      }),
      ...(data.termEndDate !== undefined && {
        termEndDate: data.termEndDate ? new Date(data.termEndDate) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json(
    await db.mortgage.findUnique({
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
  const mortgage = await getMortgageForUser(id, user.id);
  if (!mortgage) {
    return NextResponse.json({ error: "Mortgage not found" }, { status: 404 });
  }
  await db.mortgage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
