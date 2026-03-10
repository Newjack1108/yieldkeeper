import { db } from "@/lib/db";
import { syncOverdueSchedules } from "@/lib/rent";
import { getPropertyIdsForUser } from "@/lib/estate-agent";
import { startOfMonth, endOfMonth, subMonths, addDays, addMonths } from "date-fns";

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
  agentCostsThisMonth: number;
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

export type InspectionAlertRow = {
  id: string;
  property: string;
  type: string;
  scheduledDate: string;
  status: string;
};

function toNum(d: { toNumber?: () => number } | null | undefined): number {
  if (!d) return 0;
  if (typeof d === "number") return d;
  return Number(d) || 0;
}

export type AgentCostsBreakdown = {
  agentSetup: number;
  agentManagement: number;
  agentInventory: number;
  total: number;
};

export async function getMonthlyAgentCosts(
  propertyIds: string[],
  monthStart: Date,
  monthEnd: Date
): Promise<AgentCostsBreakdown> {
  if (propertyIds.length === 0) {
    return { agentSetup: 0, agentManagement: 0, agentInventory: 0, total: 0 };
  }

  const propertiesWithAgent = await db.property.findMany({
    where: {
      id: { in: propertyIds },
      lettingAgentId: { not: null },
    },
    include: {
      lettingAgent: true,
      tenancies: {
        where: { status: "active" },
      },
    },
  });

  const tenanciesStartedThisMonth = await db.tenancy.findMany({
    where: {
      propertyId: { in: propertyIds },
      startDate: { gte: monthStart, lte: monthEnd },
    },
  });

  let agentSetup = 0;
  let agentManagement = 0;
  let agentInventory = 0;

  for (const prop of propertiesWithAgent) {
    const agent = prop.lettingAgent;
    if (!agent) continue;

    if (agent.setupFee != null && toNum(agent.setupFee) > 0 && prop.lettingAgentAssignedAt) {
      const assigned = prop.lettingAgentAssignedAt;
      if (assigned >= monthStart && assigned <= monthEnd) {
        agentSetup += toNum(agent.setupFee);
      }
    }

    if (agent.managementFeeType && agent.managementFeeValue != null) {
      if (agent.managementFeeType === "monthly") {
        agentManagement += toNum(agent.managementFeeValue);
      } else if (agent.managementFeeType === "percentage") {
        let monthlyRent = 0;
        for (const t of prop.tenancies) {
          const amt = toNum(t.rentAmount);
          if (t.rentFrequency === "monthly") monthlyRent += amt;
          else if (t.rentFrequency === "weekly") monthlyRent += amt * (52 / 12);
        }
        agentManagement += monthlyRent * (toNum(agent.managementFeeValue) / 100);
      }
    }

    if (agent.inventoryFee != null && toNum(agent.inventoryFee) > 0) {
      const count = tenanciesStartedThisMonth.filter(
        (t) => t.propertyId === prop.id
      ).length;
      agentInventory += count * toNum(agent.inventoryFee);
    }
  }

  return {
    agentSetup,
    agentManagement,
    agentInventory,
    total: agentSetup + agentManagement + agentInventory,
  };
}

export async function getDashboardSummary(
  userId: string,
  role: string = "portfolio_owner"
): Promise<DashboardSummary> {
  await syncOverdueSchedules(userId, role);
  const propertyIds = await getPropertyIdsForUser(userId, role);

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
      agentCostsThisMonth: 0,
      netMonthlyProfit: 0,
    };
  }

  const [propertyCount, occupiedCount, activeTenancies, overdueRent, maintenanceOpen, complianceDueSoon, mortgagesThisMonth, insuranceThisMonth, monthlyExpenses] =
    await Promise.all([
      db.property.count({ where: { id: { in: propertyIds } } }),
      db.property.count({
        where: {
          id: { in: propertyIds },
          occupancyStatus: "occupied",
        },
      }),
      db.tenancy.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: "active",
        },
        include: { property: true },
      }),
      db.rentSchedule.aggregate({
        where: {
          status: "overdue",
          tenancy: { propertyId: { in: propertyIds } },
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
  let insuranceRenewal = 0;
  let agentCostsThisMonth = 0;
  if (role !== "estate_agent") {
    for (const m of mortgagesThisMonth) {
      const due = m.nextPaymentDate;
      if (due && due >= thisMonthStart && due <= thisMonthEnd) {
        mortgageDue += toNum(m.paymentAmount);
      }
    }
    for (const i of insuranceThisMonth) {
      const renew = i.renewalDate;
      if (renew && renew >= thisMonthStart && renew <= thisMonthEnd) {
        insuranceRenewal += toNum(i.premium);
      }
    }
    const agentCosts = await getMonthlyAgentCosts(
      propertyIds,
      thisMonthStart,
      thisMonthEnd
    );
    agentCostsThisMonth = agentCosts.total;
  }

  let totalMonthlyExpenses = mortgageDue + insuranceRenewal + agentCostsThisMonth;
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
    agentCostsThisMonth,
    netMonthlyProfit,
  };
}

export async function getMonthlyIncome(
  userId: string,
  role: string = "portfolio_owner"
): Promise<MonthlyIncomeRow[]> {
  if (role === "estate_agent") return [];
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return [];
  const months: MonthlyIncomeRow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const monthStart = startOfMonth(d);
    const monthEnd = endOfMonth(d);
    const paid = await db.rentPayment.aggregate({
      where: {
        tenancy: { propertyId: { in: propertyIds } },
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
        propertyId: { in: propertyIds },
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
  userId: string,
  role: string = "portfolio_owner"
): Promise<ExpenseBreakdownRow[]> {
  if (role === "estate_agent") return [];
  const propertyIds = await getPropertyIdsForUser(userId, role);
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

  const agentCosts = await getMonthlyAgentCosts(propertyIds, monthStart, monthEnd);

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
  byCategory["agent_setup"] = (byCategory["agent_setup"] ?? 0) + agentCosts.agentSetup;
  byCategory["agent_management"] = (byCategory["agent_management"] ?? 0) + agentCosts.agentManagement;
  byCategory["agent_inventory"] = (byCategory["agent_inventory"] ?? 0) + agentCosts.agentInventory;

  const labels: Record<string, string> = {
    mortgage: "Mortgage",
    insurance: "Insurance",
    maintenance: "Maintenance",
    compliance: "Compliance",
    management_fees: "Management",
    agent_setup: "Agent setup",
    agent_management: "Agent management",
    agent_inventory: "Agent inventory",
    utilities: "Utilities",
    improvements: "Improvements",
    other: "Other",
  };
  const ordered = [
    "mortgage",
    "insurance",
    "maintenance",
    "compliance",
    "agent_setup",
    "agent_management",
    "agent_inventory",
    "other",
  ];
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
  userId: string,
  role: string = "portfolio_owner"
): Promise<UpcomingPaymentRow[]> {
  if (role === "estate_agent") return [];
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return [];
  const properties = await db.property.findMany({
    where: { id: { in: propertyIds } },
    select: { id: true, address: true },
  });
  const propertyMap = new Map(
    properties.map((prop) => [prop.id, { address: prop.address }] as const)
  );

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

  const propertiesWithAgent = await db.property.findMany({
    where: {
      id: { in: propertyIds },
      lettingAgentId: { not: null },
    },
    include: {
      lettingAgent: true,
      tenancies: { where: { status: "active" } },
    },
  });
  for (const prop of propertiesWithAgent) {
    const agent = prop.lettingAgent;
    if (!agent || !agent.managementFeeType || agent.managementFeeValue == null)
      continue;
    let monthlyAmount = 0;
    if (agent.managementFeeType === "monthly") {
      monthlyAmount = toNum(agent.managementFeeValue);
    } else if (agent.managementFeeType === "percentage") {
      let monthlyRent = 0;
      for (const t of prop.tenancies) {
        const amt = toNum(t.rentAmount);
        if (t.rentFrequency === "monthly") monthlyRent += amt;
        else if (t.rentFrequency === "weekly") monthlyRent += amt * (52 / 12);
      }
      monthlyAmount = monthlyRent * (toNum(agent.managementFeeValue) / 100);
    }
    if (monthlyAmount <= 0) continue;
    const monthStarts: Date[] = [];
    let d = startOfMonth(now);
    if (d < now) d = addMonths(d, 1);
    while (d <= in90Days) {
      monthStarts.push(d);
      d = addMonths(d, 1);
    }
    for (const monthStart of monthStarts) {
      rows.push({
        type: "Agent management",
        property: prop.address,
        amount: monthlyAmount,
        date: monthStart.toISOString().slice(0, 10),
      });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows.slice(0, 10);
}

export async function getMaintenanceAlerts(
  userId: string,
  role: string = "portfolio_owner"
): Promise<MaintenanceAlertRow[]> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
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
  userId: string,
  role: string = "portfolio_owner"
): Promise<ComplianceAlertRow[]> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
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

export async function getInspectionAlerts(
  userId: string,
  role: string = "portfolio_owner"
): Promise<InspectionAlertRow[]> {
  const propertyIds = await getPropertyIdsForUser(userId, role);
  if (propertyIds.length === 0) return [];

  const now = new Date();
  const in90Days = addDays(now, 90);

  const items = await db.inspection.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: "scheduled",
      OR: [
        { scheduledDate: { gte: now, lte: in90Days } },
        { nextDueDate: { gte: now, lte: in90Days } },
      ],
    },
    include: { property: true },
    orderBy: { scheduledDate: "asc" },
    take: 10,
  });
  return items.map((i) => ({
    id: i.id,
    property: i.property.address,
    type: i.type,
    scheduledDate: (
      i.scheduledDate ?? i.nextDueDate ?? new Date()
    ).toISOString().slice(0, 10),
    status: i.status ?? "scheduled",
  }));
}
