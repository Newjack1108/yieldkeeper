/**
 * Mock dashboard data for initial UI development.
 * Replace with real data from getDashboardSummary() in Phase 4+.
 */

export const mockDashboardSummary = {
  totalProperties: 3,
  occupiedUnits: 2,
  monthlyRentIncome: 2100,
  outstandingArrears: 2100,
  maintenanceOpen: 2,
  complianceDueSoon: 1,
  mortgageDue: 980,
  insuranceRenewal: 189,
  netMonthlyProfit: 686,
};

export const mockMonthlyIncome = [
  { month: "Oct", income: 2100 },
  { month: "Nov", income: 2100 },
  { month: "Dec", income: 2100 },
  { month: "Jan", income: 2100 },
  { month: "Feb", income: 2100 },
  { month: "Mar", income: 2100 },
];

export const mockExpenseBreakdown = [
  { name: "Mortgage", value: 980, color: "hsl(var(--chart-1))" },
  { name: "Insurance", value: 434, color: "hsl(var(--chart-2))" },
  { name: "Maintenance", value: 85, color: "hsl(var(--chart-3))" },
  { name: "Other", value: 101, color: "hsl(var(--chart-4))" },
];

export const mockUpcomingPayments = [
  { type: "Mortgage", property: "12 Oak Street", amount: 980, date: "2025-04-01" },
  { type: "Insurance", property: "45 Maple Road", amount: 189, date: "2025-09-22" },
];

export const mockMaintenanceAlerts = [
  {
    id: "1",
    property: "12 Oak Street",
    title: "Boiler not heating water",
    priority: "urgent",
    status: "in_progress",
  },
  {
    id: "2",
    property: "45 Maple Road",
    title: "Fence panel loose",
    priority: "low",
    status: "reported",
  },
];

export const mockComplianceAlerts = [
  {
    id: "1",
    property: "12 Oak Street",
    type: "EICR",
    expiryDate: "2025-06-15",
    status: "due_soon",
  },
];
