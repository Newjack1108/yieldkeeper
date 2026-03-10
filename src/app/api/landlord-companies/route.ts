import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  address: z.string().optional(),
});

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await db.landlordCompany.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { properties: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    companies.map((c) => ({
      id: c.id,
      name: c.name,
      registrationNumber: c.registrationNumber,
      address: c.address,
      propertyCount: c._count.properties,
    }))
  );
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "portfolio_owner" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, registrationNumber, address } = parsed.data;

  const company = await db.landlordCompany.create({
    data: {
      userId: user.id,
      name,
      registrationNumber,
      address: address ?? null,
    },
  });

  return NextResponse.json(company);
}
