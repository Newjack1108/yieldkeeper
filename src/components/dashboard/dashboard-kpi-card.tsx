import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: "healthy" | "warning" | "alert";
  subtext?: string;
  format?: "currency" | "number";
}

export function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  status,
  subtext,
  format = "number",
}: DashboardKpiCardProps) {
  const statusColors = {
    healthy: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    alert: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon
          className={cn(
            "h-5 w-5",
            status && statusColors[status]
          )}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            status && statusColors[status]
          )}
        >
          {format === "currency" && typeof value === "number"
            ? `£${value.toLocaleString()}`
            : value}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
