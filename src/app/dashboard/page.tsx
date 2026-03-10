import {
  Building2,
  Users,
  PoundSterling,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  Calendar,
  FileCheck,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import {
  mockDashboardSummary,
  mockMonthlyIncome,
  mockExpenseBreakdown,
  mockUpcomingPayments,
  mockMaintenanceAlerts,
  mockComplianceAlerts,
} from "@/lib/mock-dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your property portfolio health and performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardKpiCard
          title="Total Properties"
          value={mockDashboardSummary.totalProperties}
          icon={Building2}
        />
        <DashboardKpiCard
          title="Occupied Units"
          value={mockDashboardSummary.occupiedUnits}
          icon={Users}
        />
        <DashboardKpiCard
          title="Monthly Income"
          value={mockDashboardSummary.monthlyRentIncome}
          icon={PoundSterling}
          status="healthy"
          format="currency"
        />
        <DashboardKpiCard
          title="Outstanding Arrears"
          value={mockDashboardSummary.outstandingArrears}
          icon={AlertTriangle}
          status="alert"
          format="currency"
        />
        <DashboardKpiCard
          title="Open Maintenance"
          value={mockDashboardSummary.maintenanceOpen}
          icon={Wrench}
          status="warning"
        />
        <DashboardKpiCard
          title="Compliance Due"
          value={mockDashboardSummary.complianceDueSoon}
          icon={ShieldCheck}
          status="warning"
        />
        <DashboardKpiCard
          title="Mortgage Due"
          value={mockDashboardSummary.mortgageDue}
          icon={Calendar}
          format="currency"
        />
        <DashboardKpiCard
          title="Insurance Renewal"
          value={mockDashboardSummary.insuranceRenewal}
          icon={FileCheck}
          format="currency"
        />
        <DashboardKpiCard
          title="Net Monthly Profit"
          value={mockDashboardSummary.netMonthlyProfit}
          icon={TrendingUp}
          status="healthy"
          format="currency"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Rent Income</CardTitle>
            <p className="text-sm text-muted-foreground">
              Rental income over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <IncomeChart data={mockMonthlyIncome} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Current month expense distribution
            </p>
          </CardHeader>
          <CardContent>
            <ExpenseChart data={mockExpenseBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mortgage and insurance due dates
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockUpcomingPayments.map((item) => (
                <li
                  key={`${item.type}-${item.property}`}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{item.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.property}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">£{item.amount}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Alerts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open repair and maintenance issues
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockMaintenanceAlerts.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.property}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      item.priority === "urgent"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {item.priority}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Due Soon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Certificates and checks expiring in the next 90 days
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {mockComplianceAlerts.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{item.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.property}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Expires {item.expiryDate}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Due soon
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
