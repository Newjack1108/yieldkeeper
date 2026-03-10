import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/auth";
import { getPropertyIdsForUser } from "@/lib/estate-agent";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "estate_agent") {
    const propertyIds = await getPropertyIdsForUser(user.id, user.role);
    if (propertyIds.length === 0) return NextResponse.json([]);
    const properties = await db.property.findMany({
      where: { id: { in: propertyIds } },
      select: { portfolioId: true },
    });
    const portfolioIds = [...new Set(properties.map((p) => p.portfolioId))];
    const portfolios = await db.portfolio.findMany({
      where: { id: { in: portfolioIds } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(portfolios);
  }
  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(portfolios);
}
