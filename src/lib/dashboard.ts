import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export type DashboardSummary = {
  totalProperties: number;
  occupiedUnits: number;
  monthlyRentIncome: number;
  outstandingArrears: number;
  maintenanceOpen: number;
  complianceDueSoon: number;
  mortgageDue: number;
  insuranceRenewal: number;
  netMonthlyProfit: number;
};

export type MonthlyIncomeRow = { month: string; income: number };
export type ExpenseBreakdownRow = {
  name: string;
  value: number;
  color: string;
};
export type UpcomingPaymentRow = {
  type: string;
  property: string;
  amount: number;
  date: string;
};
export type MaintenanceAlertRow = {
  id: string;
  property: string;
  title: string;
  priority: string;
  status: string;
};
export type ComplianceAlertRow = {
  id: string;
  property: string;
  type: string;
  expiryDate: string;
  status: string;
};

function toNum(d: { toNumber?: () => number } | null | undefined): number {
  if (!d) return 0;
  if (typeof d === "number") return d;
  return Number(d) || 0;
}

export async function getDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    include: { properties: true },
  });
  const portfolioIds = portfolios.map((p) => p.id);
  const propertyIds = portfolios.flatMap((p) => p.properties.map((prop) => prop.id));

  if (propertyIds.length === 0) {
    return {
      totalProperties: 0,
      occupiedUnits: 0,
      monthlyRentIncome: 0,
      outstandingArrears: 0,
      maintenanceOpen: 0,
      complianceDueSoon: 0,
      mortgageDue: 0,
      insuranceRenewal: 0,
      netMonthlyProfit: 0,
    };
  }

  const [propertyCount, occupiedCount, activeTenancies, overdueRent, maintenanceOpen, complianceDueSoon, mortgagesThisMonth, insuranceThisMonth, monthlyExpenses] =
    await Promise.all([
      db.property.count({ where: { portfolioId: { in: portfolioIds } } }),
      db.property.count({
        where: {
          portfolioId: { in: portfolioIds },
          occupancyStatus: "occupied",
        },
      }),
      db.tenancy.findMany({
        where: {
          property: { portfolioId: { in: portfolioIds } },
          status: "active",
        },
        include: { property: true },
      }),
      db.rentSchedule.aggregate({
        where: {
          status: "overdue",
          tenancy: { property: { portfolioId: { in: portfolioIds } } },
        },
        _sum: { amountDue: true },
      }),
      db.maintenanceRequest.count({
        where: {
          propertyId: { in: propertyIds },
          status: { not: "completed" },
        },
      }),
      db.complianceRecord.count({
        where: {
          propertyId: { in: propertyIds },
          expiryDate: {
            gte: new Date(),
            lte: addDays(new Date(), 90),
          },
        },
      }),
      db.mortgage.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { paymentAmount: true, nextPaymentDate: true },
      }),
      db.insurancePolicy.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { premium: true, renewalDate: true },
      }),
      db.propertyExpense.findMany({
        where: {
          propertyId: { in: propertyIds },
          date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
        },
      }),
    ]);

  let monthlyRentIncome = 0;
  for (const t of activeTenancies) {
    const amt = toNum(t.rentAmount);
    if (t.rentFrequency === "monthly") monthlyRentIncome += amt;
    else if (t.rentFrequency === "weekly") monthlyRentIncome += amt * (52 / 12);
  }

  const outstandingArrears = toNum(overdueRent._sum.amountDue);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  let mortgageDue = 0;
  for (const m of mortgagesThisMonth) {
    const due = m.nextPaymentDate;
    if (due && due >= thisMonthStart && due <= thisMonthEnd) {
      mortgageDue += toNum(m.paymentAmount);
    }
  }

  let insuranceRenewal = 0;
  for (const i of insuranceThisMonth) {
    const renew = i.renewalDate;
    if (renew && renew >= thisMonthStart && renew <= thisMonthEnd) {
      insuranceRenewal += toNum(i.premium);
    }
  }

  let totalMonthlyExpenses = mortgageDue + insuranceRenewal;
  for (const e of monthlyExpenses) {
    totalMonthlyExpenses += toNum(e.amount);
  }

  const netMonthlyProfit = monthlyRentIncome - totalMonthlyExpenses;

  return {
    totalProperties: propertyCount,
    occupiedUnits: occupiedCount,
    monthlyRentIncome,
    outstandingArrears,
    maintenanceOpen,
    complianceDueSoon,
    mortgageDue,
    insuranceRenewal,
    netMonthlyProfit,
  };
}

export async function getMonthlyIncome(
  userId: string
): Promise<MonthlyIncomeRow[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  if (portfolios.length === 0) return [];

  const portfolioIds = portfolios.map((p) => p.id);
  const months: MonthlyIncomeRow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const monthStart = startOfMonth(d);
    const monthEnd = endOfMonth(d);
    const paid = await db.rentPayment.aggregate({
      where: {
        tenancy: { property: { portfolioId: { in: portfolioIds } } },
        paidDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });
    const income = toNum(paid._sum.amount);
    months.push({
      month: monthStart.toLocaleDateString("en-GB", { month: "short" }),
      income: income || 0,
    });
  }
  if (months.every((m) => m.income === 0)) {
    const activeTenancies = await db.tenancy.findMany({
      where: {
        property: { portfolioId: { in: portfolioIds } },
        status: "active",
      },
    });
    let monthlyRent = 0;
    for (const t of activeTenancies) {
      const amt = toNum(t.rentAmount);
      if (t.rentFrequency === "monthly") monthlyRent += amt;
      else if (t.rentFrequency === "weekly") monthlyRent += amt * (52 / 12);
    }
    return months.map((m) => ({ ...m, income: monthlyRent }));
  }
  return months;
}

export async function getExpenseBreakdown(
  userId: string
): Promise<ExpenseBreakdownRow[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    include: { properties: { select: { id: true } } },
  });
  const propertyIds = portfolios.flatMap((p) => p.properties.map((prop) => prop.id));
  if (propertyIds.length === 0) return [];

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const expenses = await db.propertyExpense.findMany({
    where: {
      propertyId: { in: propertyIds },
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const mortgages = await db.mortgage.findMany({
    where: {
      propertyId: { in: propertyIds },
      nextPaymentDate: { gte: monthStart, lte: monthEnd },
    },
  });

  const insurance = await db.insurancePolicy.findMany({
    where: {
      propertyId: { in: propertyIds },
      renewalDate: { gte: monthStart, lte: monthEnd },
    },
  });

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + toNum(e.amount);
  }
  byCategory["mortgage"] =
    (byCategory["mortgage"] ?? 0) +
    mortgages.reduce((s, m) => s + toNum(m.paymentAmount), 0);
  byCategory["insurance"] =
    (byCategory["insurance"] ?? 0) +
    insurance.reduce((s, i) => s + toNum(i.premium), 0);

  const labels: Record<string, string> = {
    mortgage: "Mortgage",
    insurance: "Insurance",
    maintenance: "Maintenance",
    compliance: "Compliance",
    management_fees: "Management",
    utilities: "Utilities",
    improvements: "Improvements",
    other: "Other",
  };
  const ordered = ["mortgage", "insurance", "maintenance", "compliance", "other"];
  const rows: ExpenseBreakdownRow[] = [];
  let idx = 0;
  for (const cat of ordered) {
    if ((byCategory[cat] ?? 0) > 0) {
      rows.push({
        name: labels[cat] ?? cat,
        value: byCategory[cat]!,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      });
      idx++;
    }
  }
  const others = Object.entries(byCategory).filter(
    ([k]) => !ordered.includes(k)
  );
  if (others.length) {
    const sum = others.reduce((s, [, v]) => s + v, 0);
    rows.push({ name: "Other", value: sum, color: CHART_COLORS[idx % CHART_COLORS.length] });
  }
  return rows;
}

export async function getUpcomingPayments(
  userId: string
): Promise<UpcomingPaymentRow[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    include: { properties: true },
  });
  const propertyMap = new Map(
    portfolios.flatMap((p) =>
      p.properties.map((prop) => [prop.id, { address: prop.address }] as const)
    )
  );
  const propertyIds = Array.from(propertyMap.keys());
  if (propertyIds.length === 0) return [];

  const now = new Date();
  const in90Days = addDays(now, 90);
  const rows: UpcomingPaymentRow[] = [];

  const mortgages = await db.mortgage.findMany({
    where: {
      propertyId: { in: propertyIds },
      nextPaymentDate: { gte: now, lte: in90Days },
    },
    include: { property: true },
  });
  for (const m of mortgages) {
    if (m.nextPaymentDate) {
      rows.push({
        type: "Mortgage",
        property: m.property.address,
        amount: toNum(m.paymentAmount),
        date: m.nextPaymentDate.toISOString().slice(0, 10),
      });
    }
  }

  const insurance = await db.insurancePolicy.findMany({
    where: {
      propertyId: { in: propertyIds },
      renewalDate: { gte: now, lte: in90Days },
    },
    include: { property: true },
  });
  for (const i of insurance) {
    if (i.renewalDate) {
      rows.push({
        type: "Insurance",
        property: i.property.address,
        amount: toNum(i.premium),
        date: i.renewalDate.toISOString().slice(0, 10),
      });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows.slice(0, 10);
}

export async function getMaintenanceAlerts(
  userId: string
): Promise<MaintenanceAlertRow[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    include: { properties: true },
  });
  const propertyIds = portfolios.flatMap((p) => p.properties.map((prop) => prop.id));
  if (propertyIds.length === 0) return [];

  const items = await db.maintenanceRequest.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: { not: "completed" },
    },
    include: { property: true },
    orderBy: { reportedDate: "desc" },
    take: 10,
  });
  return items.map((m) => ({
    id: m.id,
    property: m.property.address,
    title: m.title,
    priority: m.priority,
    status: m.status,
  }));
}

export async function getComplianceAlerts(
  userId: string
): Promise<ComplianceAlertRow[]> {
  const portfolios = await db.portfolio.findMany({
    where: { userId },
    include: { properties: true },
  });
  const propertyIds = portfolios.flatMap((p) => p.properties.map((prop) => prop.id));
  if (propertyIds.length === 0) return [];

  const items = await db.complianceRecord.findMany({
    where: {
      propertyId: { in: propertyIds },
      expiryDate: { gte: new Date(), lte: addDays(new Date(), 90) },
    },
    include: { property: true },
    orderBy: { expiryDate: "asc" },
    take: 10,
  });
  return items.map((c) => ({
    id: c.id,
    property: c.property.address,
    type: c.type.toUpperCase(),
    expiryDate: c.expiryDate.toISOString().slice(0, 10),
    status: "due_soon",
  }));
}
